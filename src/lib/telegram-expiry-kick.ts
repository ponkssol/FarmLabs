import type { PrismaClient } from "@prisma/client";

/** Match `viewer-listing-access` / escrow confirm */
export const UNLOCKED_ESCROW_STATUSES = ["SETTLED", "RELEASED", "FUNDED"] as const;

export type TelegramKickTarget = {
  chatId: string;
  telegramUserId: string;
  userId: string;
  projectId: string;
};

/**
 * Buyers who should not remain in the project Telegram group: at least one completed
 * order, no remaining valid time-boxed (or lifetime) access, and `telegramUserId` set.
 */
export async function collectTelegramExpiryKicks(
  prisma: PrismaClient,
  now = new Date(),
): Promise<TelegramKickTarget[]> {
  const projects = await prisma.$queryRawUnsafe<
    Array<{ id: string; telegramGroupChatId: string }>
  >(
    `SELECT "id", "telegramGroupChatId" FROM "Project" WHERE "telegramGroupChatId" IS NOT NULL`,
  );
  const out: TelegramKickTarget[] = [];
  for (const p of projects) {
    const chatId = p.telegramGroupChatId;
    if (!chatId) continue;
    const orders = await prisma.escrowOrder.findMany({
      where: { projectId: p.id, status: { in: [...UNLOCKED_ESCROW_STATUSES] } },
      select: { buyerId: true, accessExpiresAt: true },
    });
    const hasValidAccess = new Map<string, boolean>();
    for (const o of orders) {
      const valid =
        o.accessExpiresAt == null || o.accessExpiresAt.getTime() > now.getTime();
      hasValidAccess.set(o.buyerId, (hasValidAccess.get(o.buyerId) ?? false) || valid);
    }
    for (const [buyerId, ok] of hasValidAccess) {
      if (ok) continue;
      const userRows = await prisma.$queryRawUnsafe<
        Array<{ id: string; telegramUserId: string | null }>
      >(`SELECT "id", "telegramUserId" FROM "User" WHERE "id" = ?`, buyerId);
      const user = userRows[0];
      const tg = user?.telegramUserId;
      if (user && tg) {
        out.push({
          chatId,
          telegramUserId: tg,
          userId: user.id,
          projectId: p.id,
        });
      }
    }
  }
  return out;
}

export type BanChatMemberResult = { ok: true } | { ok: false; description: string; errorCode?: number };

/** Remove user from supergroup; bot must be admin with “Ban users”. */
export async function telegramBanUser(
  botToken: string,
  chatId: string,
  telegramUserId: string,
): Promise<BanChatMemberResult> {
  const uid = Number(telegramUserId);
  if (!Number.isSafeInteger(uid)) {
    return { ok: false, description: "Invalid telegram user id" };
  }
  const res = await fetch(`https://api.telegram.org/bot${botToken}/banChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, user_id: uid }),
  });
  const j = (await res.json()) as { ok: boolean; description?: string; error_code?: number };
  if (j.ok) return { ok: true };
  return { ok: false, description: j.description ?? "Unknown Telegram error", errorCode: j.error_code };
}
