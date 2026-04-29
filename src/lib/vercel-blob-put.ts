import { put, type PutBlobResult } from "@vercel/blob";

/**
 * Vercel Blob **Private** stores require `put({ access: 'private' })`; **Public** stores
 * need `access: 'public'`. A mismatch often returns:
 * "Access denied, please provide a valid token for this resource" (misleading; token can be valid).
 *
 * @see https://vercel.com/docs/vercel-blob/private-storage
 * Set `BLOB_PUT_ACCESS=public` or `BLOB_PUT_ACCESS=private` to force (skips auto-retry).
 */
export async function putWithStoreAccessMatch(
  pathname: string,
  body: Buffer,
  contentType: string,
  token: string,
): Promise<PutBlobResult> {
  const explicit = process.env.BLOB_PUT_ACCESS?.trim().toLowerCase();
  if (explicit === "public" || explicit === "private") {
    return put(pathname, body, { access: explicit, token, contentType });
  }

  try {
    return await put(pathname, body, { access: "public", token, contentType });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isLikelyAccessMismatch =
      msg.includes("Access denied") && msg.toLowerCase().includes("valid token");
    if (isLikelyAccessMismatch) {
      console.warn(
        "[vercel-blob] Public put was denied; retrying with access: private. " +
          "Private stores need access: 'private'. For listing thumbnails on open pages, prefer a Public Blob store in Vercel (see README).",
      );
      return put(pathname, body, { access: "private", token, contentType });
    }
    throw e;
  }
}
