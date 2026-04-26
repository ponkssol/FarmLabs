/**
 * FarmLabs Telegram worker: /start?start=link_… binding + periodic kick for expired VIP access.
 *
 * Run: `npm run bot:telegram` (set TELEGRAM_BOT_TOKEN + DATABASE_URL in .env; stop with Ctrl+C).
 * The bot must be an admin in each supergroup (Ban users) listed as Project.telegramGroupChatId.
 */
import { PrismaClient } from "@prisma/client";
import { Telegraf } from "telegraf";

import { collectTelegramExpiryKicks, telegramBanUser } from "../src/lib/telegram-expiry-kick";

const prisma = new PrismaClient();
const KICK_INTERVAL_MS = Number.parseInt(process.env.TELEGRAM_KICK_INTERVAL_MS ?? "120000", 10);

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing env ${name}. Set it in .env (see TELEGRAM_BOT in docs).`);
  }
  return v;
}

let kickRunning = false;
async function runKickPass() {
  if (kickRunning) return;
  kickRunning = true;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram-bot] TELEGRAM_BOT_TOKEN not set; skip kick pass");
    kickRunning = false;
    return;
  }
  try {
    const targets = await collectTelegramExpiryKicks(prisma);
    for (const t of targets) {
      const r = await telegramBanUser(token, t.chatId, t.telegramUserId);
      if (r.ok) {
        console.log(`[kick ok] user ${t.telegramUserId} from chat ${t.chatId} (project ${t.projectId})`);
      } else {
        console.warn(
          `[kick skip] user ${t.telegramUserId} chat ${t.chatId}:`,
          r.description,
          r.errorCode != null ? `(#${r.errorCode})` : "",
        );
      }
    }
  } catch (e) {
    console.error("[kick pass]", e);
  } finally {
    kickRunning = false;
  }
}

async function main() {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const bot = new Telegraf(token);

  // Long-polling (bot.launch) does not receive updates if a webhook is still set on the bot.
  const wh = await bot.telegram.getWebhookInfo();
  if (wh.url) {
    console.warn(
      "[telegram-bot] A webhook is active (" + wh.url + ") — long-polling would be silent. Deleting webhook…",
    );
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
  }

  const { username: botU } = await bot.telegram.getMe();
  console.log(
    "[telegram-bot] @",
    botU,
    " — listening with long-polling. Open t.me/ links only while this process is running.",
  );

  bot.start(async (ctx) => {
    const pl = ctx.startPayload?.trim() ?? "";
    if (pl.startsWith("setgroup_")) {
      const from = ctx.from;
      if (!from) {
        await ctx.reply("Could not read your Telegram profile.");
        return;
      }
      const raw = pl.slice(9);
      if (!/^[a-f0-9]{32}$/i.test(raw)) {
        await ctx.reply("Invalid code. Get a new token in the paid listing editor.");
        return;
      }
      const trow = await prisma.telegramSetGroupToken.findFirst({
        where: { token: raw.toLowerCase(), usedAt: null, expiresAt: { gt: new Date() } },
      });
      if (!trow) {
        await ctx.reply("This code is invalid or expired. Generate a new one (edit paid listing).");
        return;
      }
      const tgU = String(from.id);
      await prisma.telegramSetGroupSession.upsert({
        where: { telegramUserId: tgU },
        create: { telegramUserId: tgU, token: raw.toLowerCase(), expiresAt: trow.expiresAt },
        update: { token: raw.toLowerCase(), expiresAt: trow.expiresAt },
      });
      await ctx.reply(
        [
          "Code saved. Open your VIP group, add the bot, and make it admin.",
          "Then, as a group admin, type (no 32-char code needed):",
          botU ? "  " + "/setgroup" + "  or  " + `/setgroup@${botU}` : "  " + "/setgroup",
          "Requires: you opened this link, and the seller is linked in FarmLabs (Dashboard → Create link). Not in private chat with the bot.",
          "Expires in ~30 min. Or: /setgroup <32 hex chars> in the group (from the site).",
        ].join("\n"),
      );
      return;
    }
    if (!pl.startsWith("link_") || pl.length < 8) {
      await ctx.reply(
        "FarmLabs — sign in on the site (Telegram) or link this account: Dashboard → Create link. The bot can auto-kick in groups when configured.",
      );
      return;
    }
    const raw = pl.slice(5);
    if (!/^[a-f0-9]{16,64}$/i.test(raw)) {
      await ctx.reply("Invalid link. Create a new link in the dashboard.");
      return;
    }
    const from = ctx.from;
    if (!from) {
      await ctx.reply("Could not read your Telegram profile.");
      return;
    }
    const tgId = String(from.id);
    const now = new Date();
    const row = await prisma.telegramLinkToken.findFirst({
      where: { token: raw, usedAt: null, expiresAt: { gt: now } },
    });
    if (!row) {
      await ctx.reply("This link has expired or was already used. Open the dashboard and create a new link.");
      return;
    }
    try {
      await prisma.$transaction([
        prisma.user.updateMany({ where: { telegramUserId: tgId, NOT: { id: row.userId } }, data: { telegramUserId: null } }),
        prisma.user.update({ where: { id: row.userId }, data: { telegramUserId: tgId } }),
        prisma.telegramLinkToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      ]);
      const name = [from.first_name, from.last_name].filter(Boolean).join(" ");
      await ctx.reply(
        `Connected: ${name || "user"} (id ${tgId}).\nGroup access is managed on the site; auto-kick if configured.`,
      );
    } catch (e) {
      console.error("[link]", e);
      await ctx.reply("Could not save. Try again or contact support.");
    }
  });

  bot.command("status", async (ctx) => {
    await ctx.reply("Bot is running. Kick pass about every " + String(Math.round(KICK_INTERVAL_MS / 1000)) + "s.");
  });

  // /setgroup in group saves chat id to the listing. In DM, tell the user to use a group.
  bot.command("setgroup", async (ctx) => {
    if (!ctx.from || !ctx.chat) {
      return;
    }
    if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
      await ctx.reply(
        "Open the bot link from the paid listing first (not in private chat). In the group: /setgroup without a code, or /setgroup <32 char code>.",
      );
      return;
    }
    const fromText = "text" in (ctx.message ?? {}) && typeof (ctx.message as { text: string }).text === "string"
      ? (ctx.message as { text: string }).text.trim()
      : "";
    let tokenStr = (ctx.args[0] ?? "").trim();
    if (!/^[a-f0-9]{32}$/i.test(tokenStr) && fromText) {
      const m = fromText.match(/^\/setgroup(?:@[\w]+)?\s+([a-f0-9]{32})/i);
      if (m) {
        tokenStr = m[1] ?? tokenStr;
      }
    }
    if (!/^[a-f0-9]{32}$/i.test(tokenStr)) {
      const sess = await prisma.telegramSetGroupSession.findUnique({
        where: { telegramUserId: String(ctx.from.id) },
      });
      if (sess && sess.expiresAt.getTime() > Date.now() && /^[a-f0-9]{32}$/i.test(sess.token)) {
        tokenStr = sess.token.toLowerCase();
      }
    }
    if (!/^[a-f0-9]{32}$/i.test(tokenStr)) {
      await ctx.reply(
        "Open “Open bot in Telegram” on the site first, then in this group send only /setgroup.\n" +
          "Or: /setgroup <32 character code> (from the paid listing).",
      );
      return;
    }
    tokenStr = tokenStr.toLowerCase();
    try {
      const row = await prisma.telegramSetGroupToken.findFirst({
        where: { token: tokenStr, usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, userId: true, projectId: true, expiresAt: true },
      });
      if (!row) {
        await ctx.reply("Wrong or already used code. Get a new one on the site (edit paid listing).");
        return;
      }
      if (row.expiresAt.getTime() < Date.now()) {
        await ctx.reply("This code has expired. Create a new one on the site.");
        return;
      }
      const u = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { telegramUserId: true },
      });
      if (!u || u.telegramUserId !== String(ctx.from.id)) {
        await ctx.reply("This Telegram must be linked to the same seller (Dashboard → Create link).");
        return;
      }
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (member.status !== "administrator" && member.status !== "creator") {
        await ctx.reply("You must be a group admin (or owner) to save this.");
        return;
      }
      const chatId = String(ctx.chat.id);
      const rawT =
        (ctx.chat.type === "group" || ctx.chat.type === "supergroup") && "title" in ctx.chat && ctx.chat.title
          ? String(ctx.chat.title).replace(/\s+/g, " ").trim().slice(0, 200)
          : "";
      const titleForDb = rawT.length > 0 ? rawT : null;
      const pRow = await prisma.project.findUnique({
        where: { id: row.projectId },
        select: { title: true },
      });
      const listTitle = pRow?.title ?? "Listing";
      const safeListTitle = listTitle.replace(/[`*_\\]/g, "");
      const safeGroupName = titleForDb ? titleForDb.replace(/[`*_\\]/g, "") : "";

      let invite: string | null = null;
      let inviteLine = "";
      try {
        const u = await ctx.telegram.exportChatInviteLink(ctx.chat.id);
        if (u && /^https?:\/\//i.test(u)) {
          invite = u;
          inviteLine = "\nInvite link: " + u;
        }
      } catch (e) {
        console.warn("[setgroup] exportChatInviteLink (bot needs admin + can invite):", e);
        inviteLine = "\n(Auto invite failed: ensure the bot is admin and can create invite links.)";
      }

      await prisma.$transaction([
        prisma.project.update({
          where: { id: row.projectId },
          data: {
            telegramGroupChatId: chatId,
            telegramGroupTitle: titleForDb,
            ...(invite ? { telegram: invite } : {}),
          },
        }),
        prisma.telegramSetGroupToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
        prisma.telegramSetGroupSession.deleteMany({ where: { OR: [{ telegramUserId: String(ctx.from.id) }, { token: tokenStr }] } }),
      ]);
      await ctx.reply(
        "Saved: " +
          safeListTitle +
          (safeGroupName ? "\nGroup: " + safeGroupName : "") +
          "\nChat id: " +
          chatId +
          inviteLine,
      );
    } catch (e) {
      console.error("[setgroup in chat]", e);
      await ctx.reply("Could not save. Try again, or restart the worker (npm run bot:telegram) after db push.");
    }
  });

  await bot.launch();
  console.log("[telegram-bot] Long-polling; Ctrl+C to stop. Kick every", KICK_INTERVAL_MS, "ms");
  setInterval(() => {
    void runKickPass();
  }, KICK_INTERVAL_MS);
  void runKickPass();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
