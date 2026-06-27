import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  getAirdropTokenDecimals,
  getAirdropTokenMint,
  tokenAmountToRaw,
} from "./airdrop-config";
import { getSolanaConnection } from "./escrow-solana";

const POOL_SECRET_ENV_KEYS = [
  "AIRDROP_DEV_WALLET_SECRET_BASE64",
  "AIRDROP_POOL_WALLET_SECRET_BASE64",
  "AIRDROP_DEV_WALLET_SECRET_B58",
  "AIRDROP_POOL_WALLET_SECRET_B58",
] as const;

function normalizeEnvSecret(value: string): string {
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\s+/g, "");
}

function secretFromBytes(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length === 64) {
    return bytes;
  }
  if (bytes.length === 32) {
    return Keypair.fromSeed(bytes).secretKey;
  }
  return null;
}

function decodePoolSecretValue(value: string): Uint8Array | null {
  const v = normalizeEnvSecret(value);
  if (!v) return null;

  if (v.startsWith("[")) {
    try {
      const arr = JSON.parse(v) as number[];
      if (Array.isArray(arr) && arr.length >= 32) {
        return secretFromBytes(Uint8Array.from(arr));
      }
    } catch {
      /* fall through */
    }
  }

  const base64Candidates = [
    v,
    v.replace(/ /g, "+"),
    v.replace(/-/g, "+").replace(/_/g, "/"),
  ];

  for (const candidate of [...new Set(base64Candidates)]) {
    try {
      const decoded = Buffer.from(candidate, "base64");
      if (decoded.length > 0) {
        const secret = secretFromBytes(Uint8Array.from(decoded));
        if (secret) return secret;
      }
    } catch {
      /* try next */
    }
  }

  try {
    const decoded = bs58.decode(v);
    return secretFromBytes(decoded);
  } catch {
    return null;
  }
}

function findPoolSecretEnv(): { key: string; value: string } | null {
  for (const key of POOL_SECRET_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      return { key, value };
    }
  }
  return null;
}

export function readPoolSecretRaw(): Uint8Array | null {
  const env = findPoolSecretEnv();
  if (!env) return null;
  return decodePoolSecretValue(env.value);
}

export function isAirdropPoolConfigured(): boolean {
  return readPoolSecretRaw() !== null;
}

function poolSecretError(): Error {
  const env = findPoolSecretEnv();
  const onVercel = Boolean(process.env.VERCEL);

  if (!env) {
    return new Error(
      onVercel
        ? "Airdrop pool wallet is not configured. Add AIRDROP_DEV_WALLET_SECRET_BASE64 in Vercel → Environment Variables (Production), then redeploy."
        : "AIRDROP_DEV_WALLET_SECRET_BASE64 is not set. Add it to .env and restart `npm run dev`.",
    );
  }

  return new Error(
      `${env.key} is set but invalid. Export keypair JSON from Phantom, then run: node scripts/airdrop-pool-key-to-env.mjs keypair.json — paste the output into Vercel (no quotes). If you use base64 with + characters, Vercel may turn + into spaces; re-paste or use the script output.`,
  );
}

export function airdropDevKeypairFromEnv(): Keypair {
  const secret = readPoolSecretRaw();
  if (!secret) {
    throw poolSecretError();
  }
  return Keypair.fromSecretKey(secret);
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
