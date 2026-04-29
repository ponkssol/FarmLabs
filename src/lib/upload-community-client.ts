/**
 * Client-only: upload a community logo; returns a public path like `/uploads/communities/...`.
 */
export async function uploadCommunityLogoFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  const r = await fetch("/api/upload/community", { method: "POST", body: fd });
  const j = (await r.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!r.ok) {
    throw new Error(typeof j.error === "string" ? j.error : "Failed to upload. Please try again.");
  }
  if (!j.url) {
    throw new Error("Invalid upload response");
  }
  return j.url;
}
