import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const LINK_TTL_MS = 15 * 60 * 1000;

/**
 * Create a one-time deep link: `t.me/<bot>?start=link_<token>` to bind Telegram user id to FarmLabs account.
 * Uses raw INSERT when the Prisma client is stale (missing `TelegramLinkToken` in the DMMF) so this route does not 500.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!username) {
    return NextResponse.json(
      { error: "Server has no TELEGRAM_BOT_USERNAME; set it in .env (bot handle without @)." },
      { status: 503 },
    );
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  const exIso = expiresAt.toISOString();

  try {
    try {
      await prisma.telegramLinkToken.create({
        data: {
          token,
          userId: session.user.id,
          expiresAt,
        },
      });
    } catch (e) {
      console.error("[telegram-link] prisma create, falling back to raw SQL:", e);
      const id = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "TelegramLinkToken" ("id", "token", "userId", "expiresAt", "createdAt")
         VALUES (?, ?, ?, ?, datetime('now'))`,
        id,
        token,
        session.user.id,
        exIso,
      );
    }

    const linkUrl = `https://t.me/${username}?start=link_${token}`;

    return NextResponse.json({
      linkUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("[telegram-link] failed:", e);
    return NextResponse.json(
      { error: "Could not create Telegram link. Ensure the DB is migrated (npx prisma db push) and run prisma generate." },
      { status: 500 },
    );
  }
}
