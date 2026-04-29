import { auth } from "@/auth";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 2 * 1024 * 1024;
const BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const UPLOAD_FAILED = "Failed to upload. Please try again." as const;

/**
 * One optional image per review: buyer only, before review is created for this order.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.wallet) {
      return NextResponse.json(
        { error: "Connect your Solana wallet before uploading." },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const orderId = form.get("orderId");
    const file = form.get("file");
    if (typeof orderId !== "string" || !orderId.trim()) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    const order = await prisma.escrowOrder.findUnique({
      where: { id: orderId.trim() },
      include: { review: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.review) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Max file size 2MB" }, { status: 400 });
    }
    const ext = BY_TYPE[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Use PNG, JPEG, WebP, or GIF" },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const name = `${randomUUID()}${ext}`;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (blobToken) {
      const blob = await put(`reviews/${name}`, buf, {
        access: "public",
        token: blobToken,
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url } as const);
    }

    // In Vercel production, filesystem writes are not persistent/reliable.
    if (process.env.VERCEL) {
      return NextResponse.json({ error: UPLOAD_FAILED }, { status: 503 });
    }

    // Local dev fallback when Blob token is not configured.
    const dir = join(process.cwd(), "public", "uploads", "reviews");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), buf);
    return NextResponse.json({ url: `/uploads/reviews/${name}` } as const);
  } catch (error) {
    console.error("[upload-review] failed:", error);
    return NextResponse.json({ error: UPLOAD_FAILED }, { status: 500 });
  }
}
