/** Only URLs written by our review upload API (local path or public blob URL). */
const PREFIX = "/uploads/reviews/";

export function isValidReviewImageUrl(url: string): boolean {
  if (url.length > 500 || url.includes("\\")) return false;
  if (url.startsWith(PREFIX)) {
    if (url.includes("..")) return false;
    // uuid + .png|.jpg etc.
    return /^\/uploads\/reviews\/[0-9a-f-]{36}\.(png|jpe?g|webp|gif)$/i.test(url);
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return /\.(png|jpe?g|webp|gif)$/i.test(u.pathname);
  } catch {
    return false;
  }
}
