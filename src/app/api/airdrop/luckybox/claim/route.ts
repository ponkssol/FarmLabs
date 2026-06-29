import { auth } from "@/auth";
import { sendAirdropTokens } from "@/lib/airdrop-solana";
import { AirdropClaimError, formatSolanaClaimError } from "@/lib/solana-claim-error";
import { luckyBoxFromEntry, requireWaitlistEntry } from "@/lib/airdrop-luckybox";
import { prisma } from "@/lib/prisma";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "Sign in first to claim.",
        reason: "You must be signed in with your X account before claiming rewards.",
      },
      { status: 401 },
    );
  }

  const wallet = session.user.wallet?.trim();
  if (!wallet) {
    return NextResponse.json(
      {
        error: "Connect and save your Solana wallet before claiming.",
        reason: "We need your wallet address on file to send your token reward.",
      },
      { status: 400 },
    );
  }

  const entry = await requireWaitlistEntry(session.user.id);
  if (!entry) {
    return NextResponse.json(
      {
        error: "Join the waitlist first.",
        reason: "Only waitlist members can claim a lucky box reward.",
      },
      { status: 403 },
    );
  }

  if (entry.rewardStatus === "CLAIMED" && entry.txSignature) {
    return NextResponse.json({
      luckyBox: luckyBoxFromEntry(entry),
      alreadyClaimed: true,
    });
  }

  if (entry.rewardStatus !== "OPENED" || entry.rewardAmount == null) {
    return NextResponse.json(
      {
        error: "Open your lucky box first to reveal your reward.",
        reason: "Your reward amount is only assigned after you open the lucky box.",
      },
      { status: 400 },
    );
  }

  try {
    const { signature } = await sendAirdropTokens({
      recipient: new PublicKey(wallet),
      amount: entry.rewardAmount,
    });

    const updated = await prisma.airdropWaitlist.update({
      where: { id: entry.id },
      data: {
        rewardStatus: "CLAIMED",
        txSignature: signature,
        claimedAt: new Date(),
        wallet,
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
    console.error("[airdrop/luckybox/claim]", e);
    const formatted =
      e instanceof AirdropClaimError ? { message: e.message, reason: e.reason } : formatSolanaClaimError(e);
    return NextResponse.json({ error: formatted.message, reason: formatted.reason }, { status: 500 });
  }
}
