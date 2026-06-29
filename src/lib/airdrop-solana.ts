import { Keypair, PublicKey, Transaction, type Connection } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  getAirdropClaimMinSolLamports,
  getAirdropPoolWalletAddress,
  getAirdropTokenDecimals,
  getAirdropTokenMint,
  tokenAmountToRaw,
} from "./airdrop-config";
import { AirdropClaimError, formatSolanaClaimError, INSUFFICIENT_SOL_CLAIM_MESSAGE } from "./solana-claim-error";
import { getSolanaConnection } from "./escrow-solana";

export { AirdropClaimError } from "./solana-claim-error";

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

/** pump.fun mints use Token-2022; legacy SPL uses Tokenkeg... */
async function resolveMintTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) {
    throw new Error("Airdrop token mint not found on chain. Check FARMLABS_TOKEN_MINT.");
  }
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }
  if (info.owner.equals(TOKEN_PROGRAM_ID)) {
    return TOKEN_PROGRAM_ID;
  }
  throw new Error(`Unsupported token program for mint: ${info.owner.toBase58()}`);
}

async function resolveAirdropDecimals(
  connection: Connection,
  mint: PublicKey,
  tokenProgram: PublicKey,
): Promise<number> {
  try {
    const mintInfo = await getMint(connection, mint, undefined, tokenProgram);
    return mintInfo.decimals;
  } catch {
    return getAirdropTokenDecimals();
  }
}

export type AirdropPoolTokenBalance = {
  wallet: string;
  mint: string;
  amount: number;
  decimals: number;
};

export async function getAirdropPoolTokenBalance(): Promise<AirdropPoolTokenBalance> {
  const connection = getSolanaConnection();
  const mint = getAirdropTokenMint();
  const wallet = getAirdropPoolWalletAddress();
  const poolPubkey = new PublicKey(wallet);
  const tokenProgram = await resolveMintTokenProgram(connection, mint);
  const decimals = await resolveAirdropDecimals(connection, mint, tokenProgram);
  const poolAta = getAssociatedTokenAddressSync(mint, poolPubkey, false, tokenProgram);

  try {
    const account = await getAccount(connection, poolAta, undefined, tokenProgram);
    const amount = Number(account.amount) / 10 ** decimals;
    return { wallet, mint: mint.toBase58(), amount, decimals };
  } catch {
    return { wallet, mint: mint.toBase58(), amount: 0, decimals };
  }
}

export class InsufficientRecipientSolError extends AirdropClaimError {
  constructor() {
    super({
      message: INSUFFICIENT_SOL_CLAIM_MESSAGE,
      reason:
        "You pay the network fee when claiming. Keep about 0.003 SOL in your wallet to cover transaction fees and token account rent.",
    });
  }
}

export async function assertRecipientCanPayClaimFees(recipient: PublicKey): Promise<void> {
  const connection = getSolanaConnection();
  const balance = await connection.getBalance(recipient, "confirmed");
  if (balance < getAirdropClaimMinSolLamports()) {
    throw new InsufficientRecipientSolError();
  }
}

export type PreparedAirdropClaim = {
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
};

/** Builds a partially signed claim tx: sender transfers tokens; recipient pays all fees. */
export async function buildAirdropClaimTransaction(params: {
  recipient: PublicKey;
  amount: number;
}): Promise<PreparedAirdropClaim> {
  await assertRecipientCanPayClaimFees(params.recipient);

  const connection = getSolanaConnection();
  const dev = airdropDevKeypairFromEnv();
  const mint = getAirdropTokenMint();
  const tokenProgram = await resolveMintTokenProgram(connection, mint);
  const decimals = await resolveAirdropDecimals(connection, mint, tokenProgram);
  const raw = tokenAmountToRaw(params.amount, decimals);
  if (raw <= BigInt(0)) {
    throw new Error("Airdrop amount must be greater than zero.");
  }

  const devAta = getAssociatedTokenAddressSync(mint, dev.publicKey, false, tokenProgram);
  const recipientAta = getAssociatedTokenAddressSync(
    mint,
    params.recipient,
    false,
    tokenProgram,
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      params.recipient,
      recipientAta,
      params.recipient,
      mint,
      tokenProgram,
    ),
    createTransferInstruction(
      devAta,
      recipientAta,
      dev.publicKey,
      raw,
      [],
      tokenProgram,
    ),
  );
  tx.feePayer = params.recipient;
  tx.recentBlockhash = blockhash;
  tx.partialSign(dev);

  return {
    transaction: Buffer.from(tx.serialize({ requireAllSignatures: false })).toString("base64"),
    blockhash,
    lastValidBlockHeight,
  };
}

export async function verifyAirdropClaimTransaction(params: {
  signature: string;
  recipient: PublicKey;
  amount: number;
}): Promise<boolean> {
  const connection = getSolanaConnection();
  const mint = getAirdropTokenMint();
  const tokenProgram = await resolveMintTokenProgram(connection, mint);
  const decimals = await resolveAirdropDecimals(connection, mint, tokenProgram);
  const expectedRaw = tokenAmountToRaw(params.amount, decimals);
  const recipientAta = getAssociatedTokenAddressSync(
    mint,
    params.recipient,
    false,
    tokenProgram,
  );

  const tx = await connection.getTransaction(params.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta || tx.meta.err) {
    return false;
  }

  const accountKeys = tx.transaction.message.getAccountKeys();
  const recipientAtaStr = recipientAta.toBase58();
  let ataIndex = -1;
  for (let i = 0; i < accountKeys.length; i += 1) {
    const key = accountKeys.get(i);
    if (key?.toBase58() === recipientAtaStr) {
      ataIndex = i;
      break;
    }
  }
  if (ataIndex < 0) {
    return false;
  }

  const pre = BigInt(tx.meta.preTokenBalances?.find((b) => b.accountIndex === ataIndex)?.uiTokenAmount.amount ?? "0");
  const post = BigInt(tx.meta.postTokenBalances?.find((b) => b.accountIndex === ataIndex)?.uiTokenAmount.amount ?? "0");
  const gain = post - pre;
  return gain >= expectedRaw;
}


/** @deprecated Prefer buildAirdropClaimTransaction for lucky box (recipient pays fees). */
export async function sendAirdropTokens(params: {
  recipient: PublicKey;
  amount: number;
}): Promise<{ signature: string }> {
  const connection = getSolanaConnection();
  const dev = airdropDevKeypairFromEnv();
  const mint = getAirdropTokenMint();
  const tokenProgram = await resolveMintTokenProgram(connection, mint);
  const decimals = await resolveAirdropDecimals(connection, mint, tokenProgram);
  const raw = tokenAmountToRaw(params.amount, decimals);
  if (raw <= BigInt(0)) {
    throw new Error("Airdrop amount must be greater than zero.");
  }

  const devAta = getAssociatedTokenAddressSync(mint, dev.publicKey, false, tokenProgram);
  const recipientAta = getAssociatedTokenAddressSync(
    mint,
    params.recipient,
    false,
    tokenProgram,
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      dev.publicKey,
      recipientAta,
      params.recipient,
      mint,
      tokenProgram,
    ),
    createTransferInstruction(
      devAta,
      recipientAta,
      dev.publicKey,
      raw,
      [],
      tokenProgram,
    ),
  );
  tx.feePayer = dev.publicKey;
  tx.recentBlockhash = blockhash;

  let signature: string;
  try {
    signature = await connection.sendTransaction(tx, [dev], {
      skipPreflight: false,
      maxRetries: 3,
    });
  } catch (e) {
    throw new AirdropClaimError(formatSolanaClaimError(e));
  }
  const conf = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (conf.value.err) {
    throw new AirdropClaimError(
      formatSolanaClaimError(new Error(`Airdrop transfer failed: ${JSON.stringify(conf.value.err)}`)),
    );
  }
  return { signature };
}
