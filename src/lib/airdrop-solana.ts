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

const POOL_SECRET_ENV_KEYS = [
  "AIRDROP_DEV_WALLET_SECRET_BASE64",
  "AIRDROP_POOL_WALLET_SECRET_BASE64",
] as const;

function readPoolSecretRaw(): Uint8Array | null {
  for (const key of POOL_SECRET_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;

    if (value.startsWith("[")) {
      try {
        const arr = JSON.parse(value) as number[];
        if (Array.isArray(arr) && arr.length === 64) {
          return Uint8Array.from(arr);
        }
      } catch {
        /* try base64 below */
      }
    }

    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 64) {
      return Uint8Array.from(decoded);
    }
  }

  return null;
}

export function airdropDevKeypairFromEnv(): Keypair {
  const secret = readPoolSecretRaw();
  if (!secret) {
    const onVercel = Boolean(process.env.VERCEL);
    throw new Error(
      onVercel
        ? "Airdrop pool wallet is not configured on the server. Add AIRDROP_DEV_WALLET_SECRET_BASE64 in Vercel → Settings → Environment Variables, then redeploy."
        : "AIRDROP_DEV_WALLET_SECRET_BASE64 is not set. Add it to .env and restart `npm run dev`.",
    );
  }
  return Keypair.fromSecretKey(secret);
}

export function isAirdropPoolConfigured(): boolean {
  return readPoolSecretRaw() !== null;
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
