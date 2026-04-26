import { auth } from "@/auth";
import { getPlatformFeeSol } from "@/lib/escrow-config";
import { createEscrowKeypair } from "@/lib/escrow-solana";
import { formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import { findProjectPriceOptionsByProjectId, prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const buySchema = z.object({
  projectId: z.string().min(1),
  /** Required when the listing has multiple `ProjectPriceOption` rows. */
  priceOptionId: z.string().min(1).optional().nullable(),
});

function ensurePlatformConfig() {
  if (!process.env.ESCROW_PLATFORM_PUBKEY?.trim()) {
    return "Server is not configured for on-chain escrow (set ESCROW_PLATFORM_PUBKEY to your platform fee wallet public key).";
  }
  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.wallet) {
    return NextResponse.json({ error: "Please connect your wallet first." }, { status: 403 });
  }

  const misconfig = ensurePlatformConfig();
  if (misconfig) {
    return NextResponse.json({ error: misconfig }, { status: 503 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = buySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const listing = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
  });
  if (!listing || !listing.published) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot buy your own group." }, { status: 400 });
  }
  if (listing.accessType !== "PAID" || listing.groupType !== "PRIVATE") {
    return NextResponse.json({ error: "Escrow purchase only applies to paid private groups." }, { status: 400 });
  }

  const currency = resolvePriceCurrency(listing.priceCurrency);
  if (currency === "USDC") {
    return NextResponse.json(
      {
        error:
          "Automated on-chain escrow is only enabled for SOL listings in this build. Please create a listing priced in SOL, or ask the operator to switch the price currency.",
      },
      { status: 400 },
    );
  }
  if (currency !== "SOL") {
    return NextResponse.json({ error: "Unsupported price currency for escrow." }, { status: 400 });
  }

  const priceOptions = await findProjectPriceOptionsByProjectId(listing.id);
  const opts = priceOptions.filter((o) => o.priceAmount > 0);
  let payAmount: number;
  let chosenOptionId: string | null = null;
  let chosenLabel: string | null = null;

  if (opts.length > 0) {
    const want = parsed.data.priceOptionId?.trim() || null;
    if (!want) {
      return NextResponse.json(
        { error: "Choose an access option (price tier) for this listing." },
        { status: 400 },
      );
    }
    const found = opts.find((o) => o.id === want);
    if (!found) {
      return NextResponse.json({ error: "Invalid price option for this listing." }, { status: 400 });
    }
    payAmount = found.priceAmount;
    chosenOptionId = found.id;
    chosenLabel = found.label;
  } else {
    if (!listing.priceAmount || listing.priceAmount <= 0) {
      return NextResponse.json({ error: "Invalid listing price." }, { status: 400 });
    }
    payAmount = listing.priceAmount;
  }

  const platformFee = getPlatformFeeSol();
  if (payAmount <= platformFee) {
    return NextResponse.json(
      {
        error: `Price must be greater than the platform fee (${platformFee} SOL).`,
      },
      { status: 400 },
    );
  }

  const { publicKey, privateKeyBase64 } = createEscrowKeypair();

  const order = await prisma.escrowOrder.create({
    // Matches `prisma/schema.prisma` — if TypeScript flags unknown fields, sync client: `npm run db:regen` (stop dev server on Windows if EPERM).
    data: {
      projectId: listing.id,
      buyerId: session.user.id,
      sellerId: listing.userId,
      amount: payAmount,
      currency,
      status: "AWAITING_DEPOSIT",
      escrowPublicKey: publicKey,
      escrowPrivateKey: privateKeyBase64,
      priceOptionId: chosenOptionId,
      priceOptionLabel: chosenLabel,
      note: "Awaiting SOL deposit to order escrow, then on-chain split to platform + seller.",
    } as Parameters<typeof prisma.escrowOrder.create>[0]["data"],
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    depositAddress: publicKey,
    amount: payAmount,
    currency,
    amountLabel: formatEscrowAmountLabel(payAmount, currency),
    priceOptionId: chosenOptionId,
    priceOptionLabel: chosenLabel,
    platformFeeSol: platformFee,
  });
}
