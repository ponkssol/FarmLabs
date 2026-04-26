import { auth } from "@/auth";
import { isValidReviewImageUrl } from "@/lib/review-image";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().default(""),
  /** From POST /api/upload/review, optional */
  imageUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? undefined : v)),
});

type Params = { orderId: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await context.params;
  const json = await request.json().catch(() => null);
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
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Only the buyer can leave a review" }, { status: 403 });
  }
  if (order.review) {
    return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
  }

  let imageUrl: string | undefined;
  if (parsed.data.imageUrl) {
    if (!isValidReviewImageUrl(parsed.data.imageUrl)) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }
    imageUrl = parsed.data.imageUrl;
  }

  const review = await prisma.escrowReview.create({
    data: {
      escrowOrderId: orderId,
      rating: parsed.data.rating,
      comment: parsed.data.comment.trim(),
      imageUrl: imageUrl ?? null,
    },
  });

  return NextResponse.json(review);
}
