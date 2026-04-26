/** Only URLs written by our review upload API (public path). */
const PREFIX = "/uploads/reviews/";

export function isValidReviewImageUrl(url: string): boolean {
  if (!url.startsWith(PREFIX) || url.length > 500) return false;
  if (url.includes("..") || url.includes("\\")) return false;
  // uuid + .png|.jpg etc.
  return /^\/uploads\/reviews\/[0-9a-f-]{36}\.(png|jpe?g|webp|gif)$/i.test(url);
}
