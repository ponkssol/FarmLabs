import { auth } from "@/auth";
import { getPlatformFeeSol, requiredDepositLamports } from "@/lib/escrow-config";
import {
  getSolanaConnection,
  keypairFromStored,
  settleEscrowToSellerSol,
  verifySolanaDeposit,
} from "@/lib/escrow-solana";
import { prisma } from "@/lib/prisma";
import { PublicKey } from "@solana/web3.js";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  /** Solana transaction signature of the buyer → escrow deposit. */
  signature: z.string().min(32).max(200),
});

type RouteParams = { orderId: string };

function strOrNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  try {
    return await postConfirmHandler(request, context);
  } catch (e) {
    console.error("[escrow/confirm] unhandled", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}

async function postConfirmHandler(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await context.params;
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body: need { signature: string }" }, { status: 400 });
  }
  const sig = parsed.data.signature.trim();

  const order = await prisma.escrowOrder.findUnique({
    where: { id: orderId },
    include: {
      project: true,
      buyer: true,
      seller: { select: { id: true, wallet: true } },
      priceOption: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /** Tier row: use include, or re-fetch if relation missing but `priceOptionId` is set. */
  let tier = order.priceOption;
  if (!tier && order.priceOptionId) {
    tier = await prisma.projectPriceOption.findUnique({ where: { id: order.priceOptionId } });
  }
  if (order.currency !== "SOL") {
    return NextResponse.json(
      { error: "On-chain USDC is not supported yet. Use a SOL-denominated listing for automated escrow." },
      { status: 400 },
    );
  }
  if (order.status === "SETTLED" || order.status === "RELEASED") {
    return NextResponse.json({ error: "Order already completed" }, { status: 400 });
  }
  const isRetryAfterFailedSettlement = order.status === "SETTLEMENT_FAILED";
  if (order.status !== "AWAITING_DEPOSIT" && !isRetryAfterFailedSettlement) {
    return NextResponse.json(
      { error: `Order is not waiting for a deposit (status: ${order.status})` },
      { status: 400 },
    );
  }
  if (!order.escrowPublicKey || !order.escrowPrivateKey) {
    return NextResponse.json({ error: "Order has no deposit wallet" }, { status: 500 });
  }
  if (!order.seller.wallet) {
    return NextResponse.json(
      { error: "Seller has no saved wallet address. They must add a wallet on the dashboard before funds can be sent." },
      { status: 400 },
    );
  }

  if (order.amount <= getPlatformFeeSol()) {
    return NextResponse.json(
      { error: "Order amount must be greater than the platform fee (in SOL)." },
      { status: 400 },
    );
  }
  const minLamports = requiredDepositLamports(order.amount);

  const connection = getSolanaConnection();
  let escrowPub: PublicKey;
  try {
    escrowPub = new PublicKey(order.escrowPublicKey!);
  } catch {
    return NextResponse.json({ error: "Invalid stored escrow public key for this order." }, { status: 500 });
  }

  if (isRetryAfterFailedSettlement) {
    if (order.buyerPaymentSignature) {
      if (order.buyerPaymentSignature !== sig) {
        return NextResponse.json(
          { error: "Use the same deposit transaction signature you used before to retry settlement." },
          { status: 400 },
        );
      }
    } else {
      const ok = await verifySolanaDeposit(connection, sig, escrowPub, minLamports);
      if (!ok) {
        return NextResponse.json(
          {
            error:
              "Could not verify the deposit transaction. Check the signature and that the server uses the same chain as your payment (SOLANA_RPC_URL).",
          },
          { status: 400 },
        );
      }
    }
  } else {
    const ok = await verifySolanaDeposit(connection, sig, escrowPub, minLamports);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            "Could not verify that this transaction sent at least the listed amount in SOL to the escrow address. Check the signature and the same RPC network as the server (SOLANA_RPC_URL).",
        },
        { status: 400 },
      );
    }
  }

  let settlementSig: string;
  try {
    const sellerPk = new PublicKey(order.seller.wallet);
    const kp = keypairFromStored(order.escrowPrivateKey);
    const { signature: s } = await settleEscrowToSellerSol({
      connection,
      escrow: kp,
      seller: sellerPk,
    });
    settlementSig = s;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Settlement failed";
    try {
      await prisma.escrowOrder.update({
        where: { id: orderId },
        data: {
          buyerPaymentSignature: sig,
          status: "SETTLEMENT_FAILED",
          note: reason,
        },
      });
    } catch (dbErr) {
      console.error("[escrow/confirm] failed to record SETTLEMENT_FAILED", dbErr);
    }
    return NextResponse.json(
      {
        error:
          "Your payment was detected, but sending from escrow to the platform and seller failed. You can retry with the same steps (same payment signature).",
        code: "SETTLEMENT_FAILED",
        details: reason,
        buyerTx: sig,
      },
      { status: 500 },
    );
  }

  const proj = order.project;
  let accessExpiresAt: Date | null = null;
  let grantedTelegramUrl: string | null = null;
  let grantedDiscordUrl: string | null = null;
  let grantedDiscordRoleId: string | null = null;
  if (tier) {
    const d = tier.accessDurationDays;
    if (d != null && d > 0) {
      accessExpiresAt = new Date(Date.now() + d * 86_400_000);
    }
    grantedTelegramUrl = strOrNull(tier.telegramUrl) ?? strOrNull(proj.telegram);
    grantedDiscordUrl = strOrNull(tier.discordUrl) ?? strOrNull(proj.discord);
    grantedDiscordRoleId = strOrNull(tier.discordRoleId);
  } else {
    grantedTelegramUrl = strOrNull(proj.telegram);
    grantedDiscordUrl = strOrNull(proj.discord);
  }

  await prisma.escrowOrder.update({
    where: { id: orderId },
    data: {
      buyerPaymentSignature: sig,
      settlementSignature: settlementSig,
      status: "SETTLED",
      releasedAt: new Date(),
      accessExpiresAt,
      grantedTelegramUrl,
      grantedDiscordUrl,
      grantedDiscordRoleId,
      note: "On-chain: deposit verified, platform fee + seller payout sent.",
    },
  });

  revalidatePath(`/p/${order.project.slug}`);
  revalidatePath("/dashboard");

  return NextResponse.json({
    ok: true,
    buyerTx: sig,
    settlementTx: settlementSig,
    grantedTelegramUrl,
    grantedDiscordUrl,
  });
}
