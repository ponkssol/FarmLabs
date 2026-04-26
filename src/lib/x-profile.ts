/** X profile by @handle; `handle` without or with @ */
export function xProfileUrl(handle: string | null | undefined): string | null {
  const h = handle?.replace(/^@/, "").trim();
  if (!h) return null;
  return `https://x.com/${encodeURIComponent(h)}`;
}

/**
 * Prefer /{handle}; if missing, use X numeric id from OAuth (`Account.providerAccountId`) → `/i/user/{id}`.
 */
export function xProfileUrlFromUser(
  xHandle: string | null | undefined,
  xUserId: string | null | undefined,
): string | null {
  const fromHandle = xProfileUrl(xHandle);
  if (fromHandle) return fromHandle;
  const id = xUserId?.trim();
  if (!id) return null;
  return `https://x.com/i/user/${encodeURIComponent(id)}`;
}
