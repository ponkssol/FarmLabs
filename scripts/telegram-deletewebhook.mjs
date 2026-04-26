/**
 * If the bot was ever set to use a webhook, getUpdates (used by `npm run bot:telegram`) receives nothing.
 * Run: `node --env-file=.env scripts/telegram-deletewebhook.mjs`
 */
const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!t) {
  console.error("Set TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}
const u = "https://api.telegram.org/bot" + t + "/deleteWebhook?drop_pending_updates=true";
const r = await fetch(u);
const j = await r.json();
console.log(JSON.stringify(j, null, 2));
