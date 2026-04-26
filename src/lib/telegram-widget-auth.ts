import { createHash, createHmac } from "node:crypto";

type TelegramWidgetUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

/**
 * @see https://core.telegram.org/widgets/login#checking-authorization
 * Bot token: TELEGRAM_BOT_TOKEN (same bot that handles /start, /setgroup).
 */
export function verifyTelegramLoginWidget(
  data: Record<string, string | number | undefined>,
  botToken: string,
): { ok: true; user: TelegramWidgetUser } | { ok: false; error: string } {
  if (!data.hash) return { ok: false, error: "Missing hash" };
  if (!data.id || !data.auth_date) return { ok: false, error: "Invalid payload" };

  const { hash, ...raw } = data as Record<string, string | number | undefined> & { hash: string };
  const checkParts = Object.keys(raw)
    .filter((k) => k !== "hash" && raw[k] !== undefined && raw[k] !== "")
    .sort()
    .map((k) => `${k}=${String(raw[k])}`);
  const dataCheckString = checkParts.join("\n");

  const secretKey = createHash("sha256").update(botToken, "utf8").digest();
  const computed = createHmac("sha256", secretKey as Buffer)
    .update(dataCheckString, "utf8")
    .digest("hex");

  if (computed !== String(hash)) {
    return { ok: false, error: "Invalid signature" };
  }

  const authDate = Number(data.auth_date);
  if (Number.isNaN(authDate)) return { ok: false, error: "Invalid auth_date" };
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > 24 * 60 * 60) {
    return { ok: false, error: "Login data too old" };
  }

  const id = Number(data.id);
  if (!Number.isFinite(id)) return { ok: false, error: "Invalid id" };
  return {
    ok: true,
    user: {
      id,
      first_name: String(data.first_name ?? ""),
      last_name: data.last_name != null ? String(data.last_name) : undefined,
      username: data.username != null ? String(data.username) : undefined,
      photo_url: data.photo_url != null ? String(data.photo_url) : undefined,
      auth_date: authDate,
      hash: String(hash),
    },
  };
}

export function nameFromTelegramUser(u: TelegramWidgetUser): string {
  const s = [u.first_name, u.last_name].filter(Boolean).join(" ");
  if (s.length > 0) return s;
  if (u.username) return `@${u.username}`;
  return "Telegram user";
}
