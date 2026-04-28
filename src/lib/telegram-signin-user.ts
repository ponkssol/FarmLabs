import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { nameFromTelegramUser, verifyTelegramLoginWidget } from "./telegram-widget-auth";

/**
 * Telegram Login Widget payload → find/create User with `telegramUserId`.
 * Uses Prisma; falls back to raw SQL if the client is out of date (e.g. Windows EPERM on generate).
 */
export async function findOrCreateUserForTelegramWidget(
  prisma: PrismaClient,
  botToken: string,
  data: Record<string, string | number | undefined>,
): Promise<{ id: string; name: string | null; image: string | null }> {
  const v = verifyTelegramLoginWidget(data, botToken);
  if (!v.ok) {
    throw new Error(v.error);
  }
  const u = v.user;
  const name = nameFromTelegramUser(u);
  const img = u.photo_url ?? null;
  const tgid = String(u.id);
  try {
    const out = await prisma.user.upsert({
      where: { telegramUserId: tgid },
      create: { name, image: img, telegramUserId: tgid },
      update: { name, image: img },
    });
    return { id: out.id, name: out.name, image: out.image };
  } catch {
    const newId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" ("id", "name", "image", "telegramUserId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT("telegramUserId") DO UPDATE SET
         "name" = excluded."name",
         "image" = excluded."image",
         "updatedAt" = NOW()`,
      newId,
      name,
      img,
      tgid,
    );
    const row = await prisma.$queryRawUnsafe<[{ id: string; name: string | null; image: string | null }]>(
      `SELECT "id", "name", "image" FROM "User" WHERE "telegramUserId" = $1`,
      tgid,
    );
    const o = row[0];
    if (!o) throw new Error("Telegram user upsert failed");
    return { id: o.id, name: o.name, image: o.image };
  }
}
