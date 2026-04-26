"use client";

import { signIn } from "next-auth/react";
import { useCallback, useLayoutEffect, useState } from "react";

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.35-1.01.53-1.45.51-.48-.01-1.4-.28-2.08-.52-1.02-.4-1.8-.62-1.72-1.3.04-.35.6-.7 1.64-1.16 3.3-1.64 5.5-2.67 6.6-3.1 2.8-1.1 3.4-1.3 3.8-1.3.1 0 .3.01.45.1.1.05.2.2.2.3.01.1.01.2.01.28z" />
    </svg>
  );
}

type Props = {
  callbackUrl: string;
  /** Prefer passing from the server: TELEGRAM_BOT_USERNAME or NEXT_PUBLIC_TELEGRAM_LOGIN_BOT. */
  botName?: string | null;
};

/** Telegram Login Widget: https://core.telegram.org/widgets/login */
export function SignInTelegram({ callbackUrl, botName: botNameFromServer }: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const bot = (botNameFromServer?.trim() || process.env.NEXT_PUBLIC_TELEGRAM_LOGIN_BOT?.trim()) ?? "";

  const mountWidget = useCallback(
    (el: HTMLDivElement) => {
      if (!el || !bot) return;
      el.replaceChildren();
      (window as unknown as { onTelegramAuth?: (u: Record<string, string | number>) => void }).onTelegramAuth = async (
        user: Record<string, string | number>,
      ) => {
        setErr(null);
        try {
          await signIn("telegram", {
            callbackUrl,
            redirect: true,
            payload: JSON.stringify(user),
          });
        } catch {
          setErr("Could not complete Telegram sign-in.");
        }
      };
      const s = document.createElement("script");
      s.src = "https://telegram.org/js/telegram-widget.js?22";
      s.async = true;
      s.setAttribute("data-telegram-login", bot);
      s.setAttribute("data-size", "large");
      s.setAttribute("data-userpic", "true");
      s.setAttribute("data-onauth", "onTelegramAuth");
      el.appendChild(s);
      setReady(true);
    },
    [bot, callbackUrl],
  );

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      setContainer(node);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!container || !bot) return;
    mountWidget(container);
    return () => {
      container.replaceChildren();
      (window as unknown as { onTelegramAuth?: unknown }).onTelegramAuth = undefined;
    };
  }, [container, bot, mountWidget]);

  if (!bot) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 text-left">
        <p className="text-sm text-amber-200/90">
          Add <code className="rounded bg-black/30 px-1">TELEGRAM_BOT_USERNAME</code> (and optionally{" "}
          <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_TELEGRAM_LOGIN_BOT</code> with the same @handle) in{" "}
          <code className="rounded bg-black/30 px-1">.env</code>, then restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-sky-500/20 bg-sky-500/[0.06] p-4"
      id="telegram-login"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
          <TelegramGlyph className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-sky-100/95">Log in with Telegram</p>
          <p className="text-sm text-sky-200/60">Uses @{bot} — your session is saved in FarmLabs.</p>
        </div>
      </div>
      <p className="mb-2 text-xs text-sky-100/70">Tap the button below. If you don’t see it, set your domain in BotFather (/setdomain) or use a deployed or tunneled URL (localhost often does not work with the official widget).</p>
      <div
        ref={setRef}
        className="flex min-h-[44px] items-center justify-center rounded-md border border-white/10 bg-black/20 px-2 py-2"
      />
      {!ready && (
        <p className="mt-2 text-center text-xs text-zinc-500">Loading Telegram button…</p>
      )}
      {err && <p className="mt-2 text-sm text-rose-300">{err}</p>}
      <p className="mt-3 text-sm leading-relaxed text-zinc-500">
        BotFather → <span className="text-zinc-400">/setdomain</span> for your exact site origin
        (https://…), then restart. First-time: open this page from the same host you /setdomain.
      </p>
    </div>
  );
}
