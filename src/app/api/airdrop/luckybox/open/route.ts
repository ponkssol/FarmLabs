import { auth } from "@/auth";
import { rollAirdropAmount } from "@/lib/airdrop-config";
import { getWaitlistWithLuckyBox, luckyBoxFromEntry, requireWaitlistEntry } from "@/lib/airdrop-luckybox";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function openError(message: string, reason: string, status: number) {
  return NextResponse.json({ error: message, reason }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entry = await getWaitlistWithLuckyBox(session.user.id);
  if (!entry) {
    return NextResponse.json({ error: "Join the waitlist first." }, { status: 403 });
  }

  return NextResponse.json({ luckyBox: luckyBoxFromEntry(entry) });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return openError("Sign in first.", "You must be signed in with your X account to open the lucky box.", 401);
  }

  const entry = await requireWaitlistEntry(session.user.id);
  if (!entry) {
    return openError(
      "Join the waitlist first.",
      "Only waitlist members can open a lucky box reward.",
      403,
    );
  }

  if (entry.rewardStatus === "CLAIMED") {
    return NextResponse.json({
      luckyBox: luckyBoxFromEntry(entry),
      alreadyOpened: true,
    });
  }

  if (entry.rewardStatus === "OPENED" && entry.rewardAmount != null) {
    return NextResponse.json({
      luckyBox: luckyBoxFromEntry(entry),
      alreadyOpened: true,
    });
  }

  if (entry.rewardStatus !== "READY" && entry.rewardStatus !== "FAILED") {
    return openError(
      "Lucky box cannot be opened right now.",
      "Your lucky box is already open or has been claimed.",
      409,
    );
  }

  const amount = rollAirdropAmount();
  const updated = await prisma.airdropWaitlist.update({
    where: { id: entry.id },
    data: {
      rewardAmount: amount,
      rewardStatus: "OPENED",
      openedAt: new Date(),
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
    alreadyOpened: false,
  });
}
