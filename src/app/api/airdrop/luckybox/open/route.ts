import { auth } from "@/auth";
import { rollAirdropAmount } from "@/lib/airdrop-config";
import { getWaitlistWithLuckyBox, luckyBoxFromEntry, requireWaitlistEntry } from "@/lib/airdrop-luckybox";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const entry = await requireWaitlistEntry(session.user.id);
  if (!entry) {
    return NextResponse.json({ error: "Join the waitlist first to open your lucky box." }, { status: 403 });
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
    return NextResponse.json({ error: "Lucky box cannot be opened right now." }, { status: 409 });
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
