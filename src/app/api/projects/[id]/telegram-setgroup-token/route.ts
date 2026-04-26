import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const TTL_MS = 30 * 60 * 1000;

type Params = { id: string };

/**
 * One-time /setgroup <token> in Telegram to bind a supergroup to a listing.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<Params> },
) {
  if (process.env.NEXT_PUBLIC_ENABLE_TELEGRAM_GROUP_BOT !== "true") {
    return NextResponse.json({ error: "Telegram group bot is disabled" }, { status: 403 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, title: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!username) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_USERNAME is not set on the server" },
      { status: 503 },
    );
  }
  await prisma.telegramSetGroupToken.create({
    data: { token, userId: session.user.id, projectId, expiresAt },
  });
  return NextResponse.json({
    token,
    projectTitle: project.title,
    openBotUrl: `https://t.me/${username}?start=setgroup_${token}`,
    inGroupMessage: [
      "1) Link Telegram to FarmLabs: Dashboard → Create link (once).",
      "2) “Open bot in Telegram” from here — that stores the code; in the group type: /setgroup (no 32-char paste needed).",
      "3) In the VIP group/supergroup: add the bot, make it admin, then /setgroup as a group admin.",
      "Or: /setgroup @" + username + " " + token,
      "Expires in ~30 min.",
    ].join("\n"),
  });
}
