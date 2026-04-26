import { auth } from "@/auth";
import { formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const buySchema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.wallet) {
    return NextResponse.json({ error: "Please connect your wallet first." }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = buySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const listing = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!listing || !listing.published) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot buy your own group." }, { status: 400 });
  }
  if (listing.accessType !== "PAID" || listing.groupType !== "PRIVATE") {
    return NextResponse.json({ error: "Escrow purchase only applies to paid private groups." }, { status: 400 });
  }
  if (!listing.priceAmount || listing.priceAmount <= 0) {
    return NextResponse.json({ error: "Invalid listing price." }, { status: 400 });
  }
  const currency = resolvePriceCurrency(listing.priceCurrency);
  if (currency !== "USDC" && currency !== "SOL") {
    return NextResponse.json({ error: "Unsupported price currency for escrow." }, { status: 400 });
  }

  const order = await prisma.escrowOrder.create({
    data: {
      projectId: listing.id,
      buyerId: session.user.id,
      sellerId: listing.userId,
      amount: listing.priceAmount,
      currency,
      status: "RELEASED",
      note: `MVP escrow recorded (${currency}). On-chain USDC/SOL transfer not enforced in this build.`,
      releasedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Escrow recorded: ${formatEscrowAmountLabel(listing.priceAmount, currency)} — released to the operator in this demo.`,
    orderId: order.id,
    currency,
  });
}
