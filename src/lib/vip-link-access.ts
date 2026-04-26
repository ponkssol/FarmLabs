import type { Project } from "@prisma/client";

/** Paid access (shown as "VIP" in the UI): community link fields and URLs in free text are gated until escrow. */
export function isPaidVipListing(p: Pick<Project, "accessType">): boolean {
  return p.accessType === "PAID";
}

/** @deprecated use isPaidVipListing */
export const isVipPaidListing = isPaidVipListing;

export function hasCommunityLinks(p: Pick<Project, "telegram" | "discord">): boolean {
  return Boolean(
    (p.telegram && p.telegram.trim()) || (p.discord && p.discord.trim()),
  );
}

/** Tier-level invite URLs (used when the project has no top-level Telegram/Discord). */
export type PriceOptionLinkSlice = { telegramUrl?: string | null; discordUrl?: string | null };

export function hasTierCommunityLinks(priceOptions: PriceOptionLinkSlice[] | null | undefined): boolean {
  if (!priceOptions?.length) return false;
  return priceOptions.some(
    (o) => Boolean((o.telegramUrl && o.telegramUrl.trim()) || (o.discordUrl && o.discordUrl.trim())),
  );
}

/** True when the public UI should not expose Telegram / Discord (project or tier invites). */
export function shouldMaskVipLinks(
  p: Pick<Project, "accessType" | "telegram" | "discord">,
  priceOptions?: PriceOptionLinkSlice[] | null,
): boolean {
  if (!isPaidVipListing(p)) return false;
  return hasCommunityLinks(p) || hasTierCommunityLinks(priceOptions);
}
