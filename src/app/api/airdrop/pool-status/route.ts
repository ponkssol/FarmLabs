import { isAirdropPoolConfigured, readPoolSecretRaw } from "@/lib/airdrop-solana";
import { NextResponse } from "next/server";

/** Debug helper — confirms server can read pool env (no secrets returned). */
export async function GET() {
  const configured = isAirdropPoolConfigured();
  const hasEnv = Boolean(
    process.env.AIRDROP_DEV_WALLET_SECRET_BASE64?.trim() ||
      process.env.AIRDROP_POOL_WALLET_SECRET_BASE64?.trim() ||
      process.env.AIRDROP_DEV_WALLET_SECRET_B58?.trim() ||
      process.env.AIRDROP_POOL_WALLET_SECRET_B58?.trim(),
  );

  let poolPublicKey: string | null = null;
  if (configured) {
    try {
      const { Keypair } = await import("@solana/web3.js");
      const secret = readPoolSecretRaw();
      if (secret) {
        poolPublicKey = Keypair.fromSecretKey(secret).publicKey.toBase58();
      }
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    configured,
    envPresent: hasEnv,
    poolPublicKey,
    hint: !hasEnv
      ? "Set AIRDROP_DEV_WALLET_SECRET_BASE64 on Vercel (Production) and redeploy."
      : !configured
        ? "Env is set but decode failed — run node scripts/airdrop-pool-key-to-env.mjs and re-paste without quotes."
        : "Pool wallet OK.",
  });
}
