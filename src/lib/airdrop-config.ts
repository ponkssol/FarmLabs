import { PublicKey } from "@solana/web3.js";

/** Default FarmLabs token mint (pump.fun CA). */
const DEFAULT_TOKEN_MINT = "5j5fXGDsngwLNLWq3a4GP4PmmZbuNjxTb1daC3j5pump";

/** Default airdrop sender / pool wallet (public key only). */
const DEFAULT_POOL_WALLET = "Fs8mr2mNq9PiQsQqSWXpC3xzZUR6zaGzWhwSXn419mqG";

const DEFAULT_REWARD_MIN = 50;
const DEFAULT_REWARD_MAX = 500;
const DEFAULT_TOKEN_DECIMALS = 6;

export function getAirdropTokenSymbol(): string {
  return process.env.FARMLABS_TOKEN_SYMBOL?.trim() || "FL";
}

export function getAirdropTokenMintAddress(): string {
  return process.env.FARMLABS_TOKEN_MINT?.trim() || DEFAULT_TOKEN_MINT;
}

export function getAirdropTokenMint(): PublicKey {
  return new PublicKey(getAirdropTokenMintAddress());
}

export function getAirdropPoolWalletAddress(): string {
  return process.env.AIRDROP_POOL_WALLET_ADDRESS?.trim() || DEFAULT_POOL_WALLET;
}

/** Target pool size shown on the airdrop progress bar (1M tokens). */
const DEFAULT_POOL_TARGET = 1_000_000;

export function getAirdropPoolTargetAmount(): number {
  const v = process.env.AIRDROP_POOL_TARGET?.trim();
  if (!v) return DEFAULT_POOL_TARGET;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_POOL_TARGET;
  return Math.floor(n);
}

/** Minimum SOL the recipient should hold to pay claim fees + token account rent. */
export function getAirdropClaimMinSolLamports(): number {
  const v = process.env.AIRDROP_CLAIM_MIN_SOL?.trim();
  if (!v) return 3_000_000;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 3_000_000;
  return Math.ceil(n * 1_000_000_000);
}

export function getAirdropTokenDecimals(): number {
  const v = process.env.AIRDROP_TOKEN_DECIMALS?.trim();
  if (!v) return DEFAULT_TOKEN_DECIMALS;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 18) return DEFAULT_TOKEN_DECIMALS;
  return Math.floor(n);
}

export function getAirdropRewardMin(): number {
  const v = process.env.AIRDROP_REWARD_MIN?.trim();
  if (!v) return DEFAULT_REWARD_MIN;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REWARD_MIN;
  return n;
}

export function getAirdropRewardMax(): number {
  const v = process.env.AIRDROP_REWARD_MAX?.trim();
  if (!v) return DEFAULT_REWARD_MAX;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REWARD_MAX;
  return n;
}

export function rollAirdropAmount(): number {
  const min = getAirdropRewardMin();
  const max = Math.max(min, getAirdropRewardMax());
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function tokenAmountToRaw(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  const factor = 10 ** decimals;
  return BigInt(Math.round(amount * factor));
}
