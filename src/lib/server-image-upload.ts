import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const MAX_BYTES = 2 * 1024 * 1024;
const BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function storeImageFile(
  file: File,
  folder: "communities" | "reviews",
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("Max file size 2MB");
  }
  const ext = BY_TYPE[file.type];
  if (!ext) {
    throw new Error("Use PNG, JPEG, WebP, or GIF");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${randomUUID()}${ext}`;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    const blob = await put(`${folder}/${name}`, buf, {
      access: "public",
      token: blobToken,
      contentType: file.type,
    });
    return blob.url;
  }
  if (process.env.VERCEL) {
    throw new Error("Upload storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel env.");
  }
  const dir = join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);
  return `/uploads/${folder}/${name}`;
}
