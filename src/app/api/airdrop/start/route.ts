import { auth } from "@/auth";
import { rollAirdropAmount } from "@/lib/airdrop-config";
import { airdropPrisma } from "@/lib/prisma-airdrop";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in first to start the airdrop." }, { status: 401 });
  }

  const wallet = session.user.wallet?.trim();
  if (!wallet) {
    return NextResponse.json(
      { error: "Connect and save your Solana wallet in the header first." },
      { status: 400 },
    );
  }

  const existing = await airdropPrisma.airdropClaim.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json({
      amount: existing.amount,
      status: existing.status,
      txSignature: existing.txSignature,
      wallet: existing.wallet,
      alreadyStarted: true,
    });
  }

  const amount = rollAirdropAmount();
  const claim = await airdropPrisma.airdropClaim.create({
    data: {
      userId: session.user.id,
      wallet,
      amount,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    amount: claim.amount,
    status: claim.status,
    wallet: claim.wallet,
    alreadyStarted: false,
  });
}
