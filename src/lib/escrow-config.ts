import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { DEFAULT_MAINNET_HTTP_RPC } from "./solana-rpc-defaults";

/**
 * Environment (set in .env, never commit secrets):
 * - SOLANA_RPC_URL (default: same as client — see solana-rpc-defaults)
 * - ESCROW_PLATFORM_PUBKEY: base58 public key to receive the flat platform fee
 * - ESCROW_PLATFORM_FEE_SOL: e.g. 0.02
 * - ESCROW_PLATFORM_FEE_USDC: e.g. 1.5 (for future on-chain USDC; not used until implemented)
 *
 * Do NOT put your main wallet seed phrase in the repo. Only the *public* fee receiver is needed here.
 * The per-order escrow keypair is generated server-side and used only to co-sign the settlement.
 */

const DEFAULT_PLATFORM_FEE_SOL = 0.02;
// $1.50 in USDC when we add SPL support
const DEFAULT_PLATFORM_FEE_USDC = 1.5;

export function getConnectionRpcUrl() {
  return process.env.SOLANA_RPC_URL?.trim() || DEFAULT_MAINNET_HTTP_RPC;
}

export function getPlatformPublicKey(): PublicKey {
  const s = process.env.ESCROW_PLATFORM_PUBKEY?.trim();
  if (!s) {
    throw new Error("ESCROW_PLATFORM_PUBKEY is not set (platform fee receiver, base58).");
  }
  return new PublicKey(s);
}

export function getPlatformFeeSol(): number {
  const v = process.env.ESCROW_PLATFORM_FEE_SOL?.trim();
  if (!v) return DEFAULT_PLATFORM_FEE_SOL;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PLATFORM_FEE_SOL;
  return n;
}

export function getPlatformFeeUsdc(): number {
  const v = process.env.ESCROW_PLATFORM_FEE_USDC?.trim();
  if (!v) return DEFAULT_PLATFORM_FEE_USDC;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PLATFORM_FEE_USDC;
  return n;
}

export function solToLamports(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  return BigInt(Math.round(amount * LAMPORTS_PER_SOL));
}

/** Minimum lamports buyer must send to escrow = listing price in lamports. */
export function requiredDepositLamports(sol: number): bigint {
  return solToLamports(sol);
}

/**
 * Fee in lamports; remainder goes to the seller. Listing price must be > fee.
 */
export function platformFeeLamportsSol(): bigint {
  return solToLamports(getPlatformFeeSol());
}
