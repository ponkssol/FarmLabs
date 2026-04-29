import { auth } from "@/auth";
import { putWithStoreAccessMatch } from "@/lib/vercel-blob-put";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 2 * 1024 * 1024;
const BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const UPLOAD_FAILED = "Failed to upload. Please try again." as const;

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
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
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
      const blob = await putWithStoreAccessMatch(`communities/${name}`, buf, file.type, blobToken);
      return NextResponse.json({ url: blob.url } as const);
    }

    // In Vercel production, filesystem writes are not persistent/reliable.
    if (process.env.VERCEL) {
      return NextResponse.json({ error: UPLOAD_FAILED }, { status: 503 });
    }

    // Local dev fallback when Blob token is not configured.
    const dir = join(process.cwd(), "public", "uploads", "communities");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), buf);
    return NextResponse.json({ url: `/uploads/communities/${name}` } as const);
  } catch (error) {
    console.error("[upload-community] failed:", error);
    return NextResponse.json({ error: UPLOAD_FAILED }, { status: 500 });
  }
}
