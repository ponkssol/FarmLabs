/** Shorten a Solana base58 address for inline display. Full value should go in `title` for copy/hover. */
export function shortSolanaAddress(s: string, head = 4, tail = 4): string {
  const t = s.trim();
  if (t.length <= head + tail + 1) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}
