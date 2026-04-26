import type { Project } from "@prisma/client";

/** Paid access (shown as "VIP" in the UI): community link fields and URLs in free text are gated until escrow. */
export function isPaidVipListing(p: Pick<Project, "accessType">): boolean {
  return p.accessType === "PAID";
}

/** @deprecated use isPaidVipListing */
export const isVipPaidListing = isPaidVipListing;

export function hasCommunityLinks(p: Pick<Project, "telegram" | "discord" | "xCommunity">): boolean {
  return Boolean(
    (p.telegram && p.telegram.trim()) ||
      (p.discord && p.discord.trim()) ||
      (p.xCommunity && p.xCommunity.trim()),
  );
}

/** True when the public UI should not expose Telegram / X / Discord link fields. */
export function shouldMaskVipLinks(
  p: Pick<Project, "accessType" | "telegram" | "discord" | "xCommunity">,
): boolean {
  return isPaidVipListing(p) && hasCommunityLinks(p);
}
