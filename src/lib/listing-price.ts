import type { Project } from "@prisma/client";

export function resolvePriceCurrency(
  c: string | null | undefined,
): "USDC" | "SOL" {
  return c === "SOL" ? "SOL" : "USDC";
}

/**
 * Short price label for tables and cards. Public calls: hide price (—).
 */
export function formatListingPrice(p: {
  groupType: string;
  accessType: string;
  priceAmount: number | null;
  priceCurrency: string | null;
}): string {
  if (p.groupType === "PUBLIC") return "—";
  if (p.accessType !== "PAID") return "Free";
  const amount = p.priceAmount ?? 0;
  const cur = resolvePriceCurrency(p.priceCurrency);
  if (cur === "SOL") {
    const s = amount % 1 === 0 ? String(amount) : amount.toFixed(4).replace(/\.?0+$/, "");
    return `${s} SOL`;
  }
  return `${amount.toFixed(2)} USDC`;
}

/** Private + paid + price &gt; 0 in USDC or SOL → escrow checkout allowed (MVP: order stored in app). */
export function escrowEligible(
  p: Pick<Project, "groupType" | "accessType" | "priceAmount" | "priceCurrency">,
): boolean {
  if (p.groupType !== "PRIVATE" || p.accessType !== "PAID") return false;
  if (!p.priceAmount || p.priceAmount <= 0) return false;
  const c = resolvePriceCurrency(p.priceCurrency);
  return c === "USDC" || c === "SOL";
}

export function formatEscrowAmountLabel(amount: number, currency: "USDC" | "SOL"): string {
  if (currency === "SOL") {
    const s = amount % 1 === 0 ? String(amount) : amount.toFixed(4).replace(/\.?0+$/, "");
    return `${s} SOL`;
  }
  return `${amount.toFixed(2)} USDC`;
}
