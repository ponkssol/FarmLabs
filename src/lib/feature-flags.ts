/**
 * In-dashboard Telegram group verification (links the FarmLabs worker: `npm run bot:telegram`).
 * Off by default — set `NEXT_PUBLIC_ENABLE_TELEGRAM_GROUP_BOT=true` to re-enable.
 */
export const TELEGRAM_GROUP_BOT_UI = process.env.NEXT_PUBLIC_ENABLE_TELEGRAM_GROUP_BOT === "true";

/**
 * “Telegram group id” field on the listing form. Off by default (sellers set invite links manually; kick bot optional).
 * Set `NEXT_PUBLIC_SHOW_TELEGRAM_GROUP_ID=true` to show the field again.
 */
export const TELEGRAM_GROUP_ID_FORM_UI = process.env.NEXT_PUBLIC_SHOW_TELEGRAM_GROUP_ID === "true";
