import { PublicKey } from "@solana/web3.js";

/** Default FarmLabs token mint (pump.fun CA). */
const DEFAULT_TOKEN_MINT = "5j5fXGDsngwLNLWq3a4GP4PmmZbuNjxTb1daC3j5pump";

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
