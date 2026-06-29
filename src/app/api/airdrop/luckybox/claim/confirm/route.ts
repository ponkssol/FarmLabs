import { InsufficientRecipientSolError, verifyAirdropClaimTransaction } from "@/lib/airdrop-solana";
import { luckyBoxFromEntry } from "@/lib/airdrop-luckybox";
import { resolveLuckyBoxClaimContext } from "@/lib/airdrop-luckybox-claim";
import { AirdropClaimError, formatSolanaClaimError } from "@/lib/solana-claim-error";
import { prisma } from "@/lib/prisma";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  signature: z.string().min(32).max(128),
});

export async function POST(request: Request) {
  const ctx = await resolveLuckyBoxClaimContext();
  if (!ctx.ok) {
    return ctx.response;
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid claim confirmation.",
        reason: "The transaction signature is missing or invalid.",
      },
      { status: 400 },
    );
  }

  const { signature } = parsed.data;
  const recipient = new PublicKey(ctx.wallet);

  try {
    const verified = await verifyAirdropClaimTransaction({
      signature,
      recipient,
      amount: ctx.rewardAmount,
    });
    if (!verified) {
      return NextResponse.json(
        {
          error: "Claim could not be verified.",
          reason: "The transaction did not send the expected reward to your wallet. Try claiming again.",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.airdropWaitlist.update({
      where: { id: ctx.entryId },
      data: {
        rewardStatus: "CLAIMED",
        txSignature: signature,
        claimedAt: new Date(),
        wallet: ctx.wallet,
      },
      select: {
        rewardStatus: true,
        rewardAmount: true,
        openedAt: true,
        claimedAt: true,
        txSignature: true,
      },
    });

    return NextResponse.json({
      luckyBox: luckyBoxFromEntry(updated),
      alreadyClaimed: false,
    });
  } catch (e) {
    console.error("[airdrop/luckybox/claim/confirm]", e);
    if (e instanceof InsufficientRecipientSolError || e instanceof AirdropClaimError) {
      return NextResponse.json({ error: e.message, reason: e.reason }, { status: 400 });
    }
    const formatted = formatSolanaClaimError(e);
    return NextResponse.json({ error: formatted.message, reason: formatted.reason }, { status: 500 });
  }
}
