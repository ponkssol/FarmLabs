"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TelegramVipSyncPayload = {
  telegram: string | null;
  telegramGroupChatId: string | null;
  telegramGroupTitle: string | null;
};

type Props = {
  projectId: string;
  onSynced?: (p: TelegramVipSyncPayload) => void;
};

const POLL_MS = 2500;
const POLL_MAX = 50;

/**
 * /setgroup in a group → DB. This component polls the listing so the form can fill invite + group id.
 */
export function ProjectTelegramGroupSetup({ projectId, onSynced }: Props) {
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [inGroup, setInGroup] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [synced, setSynced] = useState(false);
  const pollN = useRef(0);
  const pollKey = useRef(0);

  const create = useCallback(async () => {
    setErr(null);
    setOpenUrl(null);
    setInGroup(null);
    setLoading(true);
    setSynced(false);
    pollN.current = 0;
    pollKey.current += 1;
    try {
      const res = await fetch(`/api/projects/${projectId}/telegram-setgroup-token`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        openBotUrl?: string;
        inGroupMessage?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      if (data.openBotUrl) {
        setOpenUrl(data.openBotUrl);
        setPolling(true);
      }
      if (data.inGroupMessage) setInGroup(data.inGroupMessage);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!polling) return;
    const key = pollKey.current;
    const t = setInterval(() => {
      void (async () => {
        if (key !== pollKey.current) return;
        pollN.current += 1;
        if (pollN.current > POLL_MAX) {
          setPolling(false);
          return;
        }
        const res = await fetch(`/api/projects/${projectId}`, { credentials: "same-origin" });
        if (!res.ok) return;
        const p = (await res.json().catch(() => ({}))) as {
          telegramGroupChatId?: string | null;
          telegram?: string | null;
          telegramGroupTitle?: string | null;
        };
        if (p.telegramGroupChatId) {
          onSyncedRef.current?.({
            telegram: p.telegram ?? null,
            telegramGroupChatId: p.telegramGroupChatId,
            telegramGroupTitle: p.telegramGroupTitle ?? null,
          });
          setPolling(false);
          setSynced(true);
        }
      })();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [polling, projectId]);

  return (
    <div className="mt-2 rounded-md border border-amber-400/15 bg-amber-950/20 px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wide text-amber-200/80">2 — Verify bot in the group</p>
      <p className="mt-0.5 text-[9px] leading-relaxed text-zinc-500 sm:text-[10px]">
        The bot must be an <strong>admin</strong> in your VIP supergroup. On the site, link Telegram: Dashboard →
        Create link. Click below, open the bot, then in the <strong>group</strong> send{" "}
        <code className="text-zinc-400">/setgroup</code> (the code is stored when you use the “Open bot” link). This
        page will fill the invite and group id when done.
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void create()}
          disabled={loading}
          className="rounded border border-amber-400/25 bg-zinc-900/90 px-2.5 py-1 text-[9px] font-medium text-amber-100 disabled:opacity-50"
        >
          {loading ? "…" : "Open verification in Telegram"}
        </button>
        {polling && !synced ? (
          <span className="text-[8px] text-zinc-500">Waiting for /setgroup in the group… (auto-checking)</span>
        ) : null}
        {synced ? <span className="text-[8px] text-emerald-400/90">Synced</span> : null}
      </div>
      {openUrl ? (
        <p className="mt-2 text-[8px] text-zinc-400">
          <a className="text-sky-400 underline" href={openUrl} target="_blank" rel="noreferrer">
            Open bot in Telegram
          </a>{" "}
          → in the group → <code className="text-zinc-500">/setgroup</code> (code optional; if it fails, use the long
          line in the pre below).
        </p>
      ) : null}
      {inGroup ? (
        <pre className="mt-1.5 max-h-40 overflow-auto rounded border border-white/10 bg-black/30 p-2 text-[8px] leading-normal whitespace-pre-wrap text-zinc-400">
          {inGroup}
        </pre>
      ) : null}
      {err ? <p className="mt-1.5 text-[9px] text-rose-400/90">{err}</p> : null}
    </div>
  );
}
