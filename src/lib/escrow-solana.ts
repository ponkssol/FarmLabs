import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  Connection,
} from "@solana/web3.js";
import {
  getConnectionRpcUrl,
  getPlatformPublicKey,
  requiredDepositLamports,
  platformFeeLamportsSol,
} from "./escrow-config";

let connCache: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (!connCache) {
    connCache = new Connection(getConnectionRpcUrl(), "confirmed");
  }
  return connCache;
}

export function createEscrowKeypair(): { publicKey: string; privateKeyBase64: string; keypair: Keypair } {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKeyBase64: Buffer.from(keypair.secretKey).toString("base64"),
    keypair,
  };
}

export function keypairFromStored(privateKeyBase64: string): Keypair {
  const b = Buffer.from(privateKeyBase64, "base64");
  if (b.length !== 64) {
    throw new Error("Invalid escrow private key in storage");
  }
  return Keypair.fromSecretKey(Uint8Array.from(b));
}

export async function verifySolanaDeposit(
  connection: Connection,
  txSignature: string,
  toPubkey: PublicKey,
  minLamports: bigint,
): Promise<boolean> {
  try {
    const tx = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta || tx.meta.err) {
      return false;
    }
    const messageKeys = tx.transaction.message.getAccountKeys();
    const keys: PublicKey[] = [];
    for (let i = 0; i < messageKeys.length; i += 1) {
      const k = messageKeys.get(i);
      if (k) keys.push(k);
    }
    if (keys.length === 0) {
      return false;
    }
    const idx = keys.findIndex((k: PublicKey) => k.equals(toPubkey));
    if (idx < 0) {
      return false;
    }
    const pre = BigInt(tx.meta.preBalances[idx] ?? 0);
    const post = BigInt(tx.meta.postBalances[idx] ?? 0);
    const gain = post - pre;
    return gain >= minLamports;
  } catch (e) {
    console.error("[verifySolanaDeposit]", e);
    return false;
  }
}

function lamportsToNumberForTransfer(n: bigint): number {
  if (n < BigInt(0) || n > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Transfer lamport amount is out of safe number range");
  }
  return Number(n);
}

/**
 * Split escrow: platform fee + (remainder − network fee) to seller, so the fee payer (escrow) can
 * end at 0 balance (account closed). A fixed "buffer" (e.g. 50k) left in escrow is **below** rent
 * and makes simulation fail with "insufficient funds for rent".
 */
export async function settleEscrowToSellerSol(params: {
  connection: Connection;
  escrow: Keypair;
  seller: PublicKey;
}): Promise<{ signature: string }> {
  const { connection, escrow, seller } = params;
  const platform = getPlatformPublicKey();
  const balance = BigInt(await connection.getBalance(escrow.publicKey, "confirmed"));
  const platformLamports = platformFeeLamportsSol();
  if (balance <= platformLamports) {
    throw new Error(
      `Escrow balance too low: have ${(Number(balance) / LAMPORTS_PER_SOL).toFixed(6)} SOL, need more than platform fee (${(Number(platformLamports) / LAMPORTS_PER_SOL).toFixed(6)} SOL).`,
    );
  }
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const buildTx = (toSeller: bigint) => {
    const t = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: escrow.publicKey,
        toPubkey: platform,
        lamports: lamportsToNumberForTransfer(platformLamports),
      }),
      SystemProgram.transfer({
        fromPubkey: escrow.publicKey,
        toPubkey: seller,
        lamports: lamportsToNumberForTransfer(toSeller),
      }),
    );
    t.feePayer = escrow.publicKey;
    t.recentBlockhash = blockhash;
    return t;
  };

  // Draft to discover network fee (amounts don't change message size).
  const draftToSeller = balance - platformLamports - BigInt(1_000_000);
  if (draftToSeller <= BigInt(0)) {
    throw new Error("Escrow balance is not enough to pay platform fee and estimated network fee.");
  }
  const tx0 = buildTx(draftToSeller);
  const fee0 = await tx0.getEstimatedFee(connection);
  if (fee0 == null) {
    throw new Error("Could not estimate transaction fee (getEstimatedFee returned null).");
  }
  let networkFee = BigInt(fee0);
  let toSeller = balance - platformLamports - networkFee;
  if (toSeller <= BigInt(0)) {
    throw new Error("Not enough in escrow after network fee to pay the seller.");
  }

  // Re-estimate with final transfer amount (fee is usually identical).
  const tx1 = buildTx(toSeller);
  const fee1 = await tx1.getEstimatedFee(connection);
  if (fee1 != null) {
    networkFee = BigInt(fee1);
    toSeller = balance - platformLamports - networkFee;
  }
  if (toSeller <= BigInt(0)) {
    throw new Error("Not enough in escrow after network fee to pay the seller.");
  }

  const tx = buildTx(toSeller);
  const raw = await connection.sendTransaction(tx, [escrow], { skipPreflight: false, maxRetries: 3 });
  const conf = await connection.confirmTransaction(
    { signature: raw, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (conf.value.err) {
    throw new Error(`Settlement failed: ${JSON.stringify(conf.value.err)}`);
  }
  return { signature: raw };
}

export { requiredDepositLamports, platformFeeLamportsSol } from "./escrow-config";
