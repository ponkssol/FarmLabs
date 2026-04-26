/**
 * Optional: set AUTH_X_ALLOWLIST in .env to restrict who can sign in with X
 * (comma- or space-separated, @ optional, case-insensitive). Empty / unset = allow all.
 */
export function getXHandleAllowlist(): Set<string> | null {
  const raw = process.env.AUTH_X_ALLOWLIST?.trim();
  if (!raw) return null;
  const set = new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.replace(/^@+/, "").toLowerCase())
      .filter(Boolean),
  );
  return set.size > 0 ? set : null;
}

export function isXHandleInAllowlist(handle: string | undefined | null): boolean {
  const list = getXHandleAllowlist();
  if (!list) return true;
  if (!handle?.trim()) return false;
  return list.has(handle.replace(/^@+/, "").toLowerCase().trim());
}
