import { auth } from "@/auth";
import { sendAirdropTokens } from "@/lib/airdrop-solana";
import { prisma } from "@/lib/prisma";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in first to claim." }, { status: 401 });
  }

  const wallet = session.user.wallet?.trim();
  if (!wallet) {
    return NextResponse.json(
      { error: "Connect and save your Solana wallet in the header first." },
      { status: 400 },
    );
  }

  const claim = await prisma.airdropClaim.findUnique({
    where: { userId: session.user.id },
  });
  if (!claim) {
    return NextResponse.json({ error: "Press Start first to earn your reward." }, { status: 400 });
  }
  if (claim.status === "CLAIMED" && claim.txSignature) {
    return NextResponse.json({
      amount: claim.amount,
      status: claim.status,
      txSignature: claim.txSignature,
      alreadyClaimed: true,
    });
  }
  if (claim.status !== "PENDING") {
    return NextResponse.json({ error: "This claim cannot be processed. Try again later." }, { status: 409 });
  }

  try {
    const { signature } = await sendAirdropTokens({
      recipient: new PublicKey(wallet),
      amount: claim.amount,
    });

    const updated = await prisma.airdropClaim.update({
      where: { id: claim.id },
      data: {
        status: "CLAIMED",
        txSignature: signature,
        claimedAt: new Date(),
        wallet,
      },
    });

    return NextResponse.json({
      amount: updated.amount,
      status: updated.status,
      txSignature: updated.txSignature,
      alreadyClaimed: false,
    });
  } catch (e) {
    console.error("[airdrop/claim]", e);
    const msg = e instanceof Error ? e.message : "Claim failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
