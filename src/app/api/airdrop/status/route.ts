import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claim = await prisma.airdropClaim.findUnique({
    where: { userId: session.user.id },
    select: {
      amount: true,
      status: true,
      txSignature: true,
      wallet: true,
      startedAt: true,
      claimedAt: true,
    },
  });

  return NextResponse.json({
    wallet: session.user.wallet ?? null,
    claim,
  });
}
