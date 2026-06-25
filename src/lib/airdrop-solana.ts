import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getAirdropTokenDecimals,
  getAirdropTokenMint,
  tokenAmountToRaw,
} from "./airdrop-config";
import { getSolanaConnection } from "./escrow-solana";

export function airdropDevKeypairFromEnv(): Keypair {
  const b64 = process.env.AIRDROP_DEV_WALLET_SECRET_BASE64?.trim();
  if (!b64) {
    throw new Error("AIRDROP_DEV_WALLET_SECRET_BASE64 is not set.");
  }
  const b = Buffer.from(b64, "base64");
  if (b.length !== 64) {
    throw new Error("Invalid AIRDROP_DEV_WALLET_SECRET_BASE64 (expected 64-byte secret key).");
  }
  return Keypair.fromSecretKey(Uint8Array.from(b));
}

export async function sendAirdropTokens(params: {
  recipient: PublicKey;
  amount: number;
}): Promise<{ signature: string }> {
  const connection = getSolanaConnection();
  const dev = airdropDevKeypairFromEnv();
  const mint = getAirdropTokenMint();
  const decimals = getAirdropTokenDecimals();
  const raw = tokenAmountToRaw(params.amount, decimals);
  if (raw <= BigInt(0)) {
    throw new Error("Airdrop amount must be greater than zero.");
  }

  const devAta = getAssociatedTokenAddressSync(mint, dev.publicKey);
  const recipientAta = getAssociatedTokenAddressSync(mint, params.recipient);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      dev.publicKey,
      recipientAta,
      params.recipient,
      mint,
    ),
    createTransferInstruction(devAta, recipientAta, dev.publicKey, raw, [], TOKEN_PROGRAM_ID),
  );
  tx.feePayer = dev.publicKey;
  tx.recentBlockhash = blockhash;

  const signature = await connection.sendTransaction(tx, [dev], {
    skipPreflight: false,
    maxRetries: 3,
  });
  const conf = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (conf.value.err) {
    throw new Error(`Airdrop transfer failed: ${JSON.stringify(conf.value.err)}`);
  }
  return { signature };
}
