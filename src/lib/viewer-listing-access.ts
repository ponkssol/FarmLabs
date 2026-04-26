import type { Project } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redactVipSocialLinks } from "@/lib/redact-vip-text";
import { isPaidVipListing, shouldMaskVipLinks } from "@/lib/vip-link-access";

/** Project IDs the current user has unlocked via a recorded escrow purchase. */
export async function fetchEscrowUnlockedProjectIds(
  buyerId: string | undefined,
  projectIds: string[],
): Promise<Set<string>> {
  if (!buyerId || projectIds.length === 0) {
    return new Set();
  }
  const rows = await prisma.escrowOrder.findMany({
    where: { buyerId, projectId: { in: projectIds } },
    select: { projectId: true },
  });
  return new Set(rows.map((r) => r.projectId));
}

export function resolveVipViewForProject(
  p: Pick<Project, "id" | "userId" | "accessType" | "telegram" | "discord" | "xCommunity">,
  viewerId: string | undefined,
  unlockedProjectIds: Set<string>,
) {
  const isOwner = Boolean(viewerId && viewerId === p.userId);
  /** Full links and text only after an escrow order exists—not because the viewer is the owner. */
  const hasEscrowAccess = Boolean(viewerId && unlockedProjectIds.has(p.id));
  const revealLinks = hasEscrowAccess;
  const maskVipLinks = shouldMaskVipLinks(p) && !revealLinks;
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
    ...(state.maskVipLinks ? { telegram: null, discord: null, xCommunity: null } : {}),
  } as T;
}
