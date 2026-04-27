import type { Project } from "@prisma/client";

export function resolvePriceCurrency(
  c: string | null | undefined,
): "USDC" | "SOL" {
  return c === "USDC" ? "USDC" : "SOL";
}

function formatAmountLine(amount: number, cur: "USDC" | "SOL"): string {
  if (cur === "SOL") {
    const s = amount % 1 === 0 ? String(amount) : amount.toFixed(4).replace(/\.?0+$/, "");
    return `${s} SOL`;
  }
  return `${amount.toFixed(2)} USDC`;
}

/**
 * Short price label for tables and cards. Public calls: hide price (—).
 * With multiple `priceOptions`, shows "from X" using the minimum tier.
 */
export function formatListingPrice(
  p: {
    groupType: string;
    accessType: string;
    priceAmount: number | null;
    priceCurrency: string | null;
  },
  priceOptions?: { priceAmount: number }[] | null,
): string {
  if (p.groupType === "PUBLIC") return "—";
  if (p.accessType !== "PAID") return "Free";
  const cur = resolvePriceCurrency(p.priceCurrency);
  const tiers = priceOptions?.filter((o) => o.priceAmount > 0) ?? [];
  if (tiers.length > 1) {
    const min = Math.min(...tiers.map((o) => o.priceAmount));
    return `from ${formatAmountLine(min, cur)}`;
  }
  if (tiers.length === 1) {
    return formatAmountLine(tiers[0].priceAmount, cur);
  }
  return formatAmountLine(p.priceAmount ?? 0, cur);
}

/** Private + paid + price &gt; 0 in USDC or SOL → escrow checkout allowed (MVP: order stored in app). */
export function escrowEligible(
  p: Pick<Project, "groupType" | "accessType" | "priceAmount" | "priceCurrency">,
  priceOptions?: { priceAmount: number }[] | null,
): boolean {
  if (p.groupType !== "PRIVATE" || p.accessType !== "PAID") return false;
  const c = resolvePriceCurrency(p.priceCurrency);
  if (c !== "USDC" && c !== "SOL") return false;
  const tiers = priceOptions?.filter((o) => o.priceAmount > 0) ?? [];
  if (tiers.length > 0) {
    return Math.min(...tiers.map((o) => o.priceAmount)) > 0;
  }
  if (!p.priceAmount || p.priceAmount <= 0) return false;
  return true;
}

/** When true, show the Solana monogram left of a formatted price label. */
export function shouldShowSolanaMonogram(
  p: {
    groupType: string;
    accessType: string;
    priceCurrency: string | null;
  },
  label: string,
): boolean {
  if (label === "—" || label === "Free") return false;
  return resolvePriceCurrency(p.priceCurrency) === "SOL";
}

export function formatEscrowAmountLabel(amount: number, currency: "USDC" | "SOL"): string {
  if (currency === "SOL") {
    const s = amount % 1 === 0 ? String(amount) : amount.toFixed(4).replace(/\.?0+$/, "");
    return `${s} SOL`;
  }
  return `${amount.toFixed(2)} USDC`;
}
