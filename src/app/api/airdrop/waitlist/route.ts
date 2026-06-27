import { auth } from "@/auth";
import { luckyBoxFromEntry } from "@/lib/airdrop-luckybox";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function requireXAccount(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "twitter" },
    select: { id: true },
  });
  return Boolean(account);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ joined: false, hasXAccount: false, hasWallet: false });
  }

  const [entry, hasXAccount] = await Promise.all([
    prisma.airdropWaitlist.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        wallet: true,
        createdAt: true,
        rewardStatus: true,
        rewardAmount: true,
        openedAt: true,
        claimedAt: true,
        txSignature: true,
      },
    }),
    requireXAccount(session.user.id),
  ]);

  const hasWallet = Boolean(session.user.wallet?.trim());

  return NextResponse.json({
    joined: Boolean(entry),
    hasXAccount,
    hasWallet,
    entry: entry
      ? {
          wallet: entry.wallet,
          createdAt: entry.createdAt.toISOString(),
          luckyBox: luckyBoxFromEntry(entry),
        }
      : null,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in with X first to join the waitlist." }, { status: 401 });
  }

  const hasXAccount = await requireXAccount(session.user.id);
  if (!hasXAccount) {
    return NextResponse.json(
      { error: "Waitlist requires an X (Twitter) account. Sign in with X to continue." },
      { status: 403 },
    );
  }

  const wallet = session.user.wallet?.trim();
  if (!wallet) {
    return NextResponse.json(
      { error: "Connect and save your Solana wallet before joining the waitlist." },
      { status: 400 },
    );
  }

  const existing = await prisma.airdropWaitlist.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json({
      joined: true,
      alreadyJoined: true,
      createdAt: existing.createdAt.toISOString(),
      wallet: existing.wallet,
      luckyBox: luckyBoxFromEntry(existing),
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xHandle: true, name: true },
  });

  const entry = await prisma.airdropWaitlist.create({
    data: {
      userId: session.user.id,
      wallet,
      xHandle: user?.xHandle ?? null,
      name: user?.name ?? null,
    },
  });

  return NextResponse.json({
    joined: true,
    alreadyJoined: false,
    createdAt: entry.createdAt.toISOString(),
    wallet: entry.wallet,
    luckyBox: luckyBoxFromEntry(entry),
  });
}
