import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  reply: z.string().min(0).max(2000).optional().default(""),
});

type Params = { orderId: string };

/**
 * Listing operator replies to a buyer review (one thread per order; can edit by posting again).
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await context.params;
    if (!orderId) {
      return NextResponse.json({ error: "Order not found" }, { status: 400 });
    }

    const json: unknown = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const order = await prisma.escrowOrder.findUnique({
      where: { id: orderId },
      include: { review: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.sellerId !== session.user.id) {
      return NextResponse.json({ error: "Only the listing operator can reply" }, { status: 403 });
    }
    if (!order.review) {
      return NextResponse.json({ error: "No review to reply to" }, { status: 400 });
    }

    const text = parsed.data.reply.trim();

    const updated = await prisma.escrowReview.update({
      where: { escrowOrderId: orderId },
      data: {
        sellerReply: text,
        sellerRepliedAt: text ? new Date() : null,
      },
    });

    return NextResponse.json({
      id: updated.id,
      sellerReply: updated.sellerReply,
      sellerRepliedAt: updated.sellerRepliedAt
        ? updated.sellerRepliedAt.toISOString()
        : null,
    });
  } catch (e) {
    console.error("[escrow review reply]", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
      }
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to update reply",
        // Helps when Prisma client is out of date vs schema (missing columns in generated client)
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
