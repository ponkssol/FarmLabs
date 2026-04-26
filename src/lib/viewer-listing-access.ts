import type { Project } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redactVipSocialLinks } from "@/lib/redact-vip-text";
import type { PriceOptionLinkSlice } from "@/lib/vip-link-access";
import { isPaidVipListing, shouldMaskVipLinks } from "@/lib/vip-link-access";

/** Project IDs the current user has unlocked via a recorded escrow purchase. */
export async function fetchEscrowUnlockedProjectIds(
  buyerId: string | undefined,
  projectIds: string[],
): Promise<Set<string>> {
  if (!buyerId || projectIds.length === 0) {
    return new Set();
  }
  const now = new Date();
  const rows = await prisma.escrowOrder.findMany({
    where: {
      buyerId,
      projectId: { in: projectIds },
      status: { in: ["SETTLED", "RELEASED", "FUNDED"] },
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
    },
    select: { projectId: true },
  });
  return new Set(rows.map((r) => r.projectId));
}

/** Latest active purchase for this listing (used for tier-specific links + access expiry). */
export async function fetchActiveEscrowAccessForProject(
  buyerId: string | undefined,
  projectId: string,
) {
  if (!buyerId) return null;
  const now = new Date();
  return prisma.escrowOrder.findFirst({
    where: {
      buyerId,
      projectId,
      status: { in: ["SETTLED", "RELEASED", "FUNDED"] },
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      accessExpiresAt: true,
      priceOptionLabel: true,
      priceOptionId: true,
      grantedTelegramUrl: true,
      grantedDiscordUrl: true,
      grantedDiscordRoleId: true,
      priceOption: {
        select: { id: true, telegramUrl: true, discordUrl: true },
      },
    },
  });
}

export function resolveVipViewForProject(
  p: Pick<Project, "id" | "userId" | "accessType" | "telegram" | "discord">,
  viewerId: string | undefined,
  unlockedProjectIds: Set<string>,
  priceOptions?: PriceOptionLinkSlice[] | null,
) {
  const isOwner = Boolean(viewerId && viewerId === p.userId);
  /** Full links and text only after an escrow order exists—not because the viewer is the owner. */
  const hasEscrowAccess = Boolean(viewerId && unlockedProjectIds.has(p.id));
  const revealLinks = hasEscrowAccess;
  const maskVipLinks = shouldMaskVipLinks(p, priceOptions) && !revealLinks;
  const redactVipText = isPaidVipListing(p) && !revealLinks;
  return { revealLinks, hasEscrowAccess, isOwner, maskVipLinks, redactVipText };
}

/**
 * Apply to list/card rows: redact URLs in text and clear community link fields
 * for viewers who have not unlocked the listing (no escrow order).
 */
export function applyVipMaskToProject<T extends Project>(
  p: T,
  state: { redactVipText: boolean; maskVipLinks: boolean },
): T {
  if (!state.redactVipText && !state.maskVipLinks) {
    return p;
  }
  return {
    ...p,
    ...(state.redactVipText && "shortPitch" in p && p.shortPitch
      ? { shortPitch: redactVipSocialLinks(p.shortPitch) }
      : {}),
    ...(state.maskVipLinks
      ? {
          telegram: null,
          discord: null,
          ...("priceOptions" in p && Array.isArray(p.priceOptions)
            ? {
                priceOptions: p.priceOptions.map((o) => ({ ...o, telegramUrl: null, discordUrl: null })),
              }
            : {}),
        }
      : {}),
  } as T;
}
