import { buildAirdropClaimTransaction, InsufficientRecipientSolError } from "@/lib/airdrop-solana";
import { resolveLuckyBoxClaimContext } from "@/lib/airdrop-luckybox-claim";
import { AirdropClaimError, formatSolanaClaimError } from "@/lib/solana-claim-error";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

export async function POST() {
  const ctx = await resolveLuckyBoxClaimContext();
  if (!ctx.ok) {
    return ctx.response;
  }

  try {
    const prepared = await buildAirdropClaimTransaction({
      recipient: new PublicKey(ctx.wallet),
      amount: ctx.rewardAmount,
    });

    return NextResponse.json({
      transaction: prepared.transaction,
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
      amount: ctx.rewardAmount,
      wallet: ctx.wallet,
    });
  } catch (e) {
    console.error("[airdrop/luckybox/claim/prepare]", e);
    if (e instanceof InsufficientRecipientSolError || e instanceof AirdropClaimError) {
      return NextResponse.json({ error: e.message, reason: e.reason }, { status: 400 });
    }
    const formatted = formatSolanaClaimError(e);
    return NextResponse.json({ error: formatted.message, reason: formatted.reason }, { status: 500 });
  }
}
