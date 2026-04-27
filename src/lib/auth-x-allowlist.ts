/**
 * Optional: set AUTH_X_ALLOWLIST in .env to restrict who can sign in with X
 * (comma- or space-separated, @ optional, case-insensitive). Empty / unset = allow all.
 */
function normalizeXHandle(s: string): string {
  return s
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .trim();
}

function parseAllowlistRaw(raw: string): string[] {
  return raw
    .replace(/^['"]+|['"]+$/g, "")
    .split(/[\s,]+/)
    .map((s) => s.replace(/^['"]+|['"]+$/g, ""))
    .map((s) => normalizeXHandle(s))
    .filter(Boolean);
}

export function getXHandleAllowlist(): Set<string> | null {
  const baseRaw = process.env.AUTH_X_ALLOWLIST?.trim() ?? "";
  const extraRaw = process.env.AUTH_X_ALLOWLIST_EXTRA?.trim() ?? "";
  const merged = [...parseAllowlistRaw(baseRaw), ...parseAllowlistRaw(extraRaw)];
  if (merged.length === 0) return null;
  const set = new Set(merged);
  return set.size > 0 ? set : null;
}

export function isXHandleInAllowlist(handle: string | undefined | null): boolean {
  const list = getXHandleAllowlist();
  if (!list) return true;
  if (!handle?.trim()) return false;
  const normalized = normalizeXHandle(handle);
  const ok = list.has(normalized);
  if (!ok) {
    console.warn("[auth][x] allowlist debug", {
      input: handle,
      normalized,
      allowlist: Array.from(list.values()),
    });
  }
  return ok;
}
