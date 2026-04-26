/**
 * Redact Telegram, X, and Discord URLs in free text (About, Rules, etc.)
 * for paid/VIP listings when the viewer has not unlocked via escrow.
 */
export function redactVipSocialLinks(text: string): string {
  if (!text) return text;
  let t = text;
  const one = (re: RegExp) => {
    t = t.replace(re, "—");
  };
  one(
    /https?:\/\/(?:[a-z0-9-]+\.)?(?:t\.me|telegram\.me)(?:\/[^\s<>"'`).,\]]+)?/gi,
  );
  one(
    /https?:\/\/(?:[a-z0-9-]+\.)?(?:x\.com|twitter\.com)(?:\/[^\s<>"'`).,\]]+)?/gi,
  );
  one(
    /https?:\/\/(?:[a-z0-9-]+\.)?discord\.(?:com\/(?:invite|channels)\/[^\s<>"'`).,\]]+|gg\/[^\s<>"'`).,\]]+)/gi,
  );
  t = t.replace(/\b(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+/?=&.%#-]+/gi, "—");
  t = t.replace(/\b(?:x\.com|twitter\.com)\/[a-zA-Z0-9_+/?=&.-]+/gi, "—");
  t = t.replace(
    /\bdiscord\.(?:gg\/[a-zA-Z0-9-]+|com\/(?:invite|channels)\/[a-zA-Z0-9_+/?=-]+)\b/gi,
    "—",
  );
  return t;
}
