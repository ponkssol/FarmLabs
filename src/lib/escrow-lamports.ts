import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/** Same formula as `solToLamports` in escrow-config (server) — keep in sync. */
export function solListingToLamports(sol: number): bigint {
  if (!Number.isFinite(sol) || sol <= 0) return BigInt(0);
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}
