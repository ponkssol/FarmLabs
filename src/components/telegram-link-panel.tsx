"use client";

import { useState } from "react";

type Props = {
  linked: boolean;
  /** Last 4 digits of Telegram id for display (optional) */
  telegramIdHint: string | null;
};

export function TelegramLinkPanel({ linked, telegramIdHint }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setError(null);
    setLoading(true);
    setLinkUrl(null);
    setCopied(false);
    try {
      const res = await fetch("/api/me/telegram-link", { method: "POST" });
      if (res.status === 401) {
        const back =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/dashboard";
        window.location.assign("/login?callbackUrl=" + encodeURIComponent(back));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { linkUrl?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to create link");
      }
      if (data.linkUrl) setLinkUrl(data.linkUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Copy the link manually.");
    }
  }

  return (
    <div className="mt-2.5 rounded-lg border border-white/8 bg-black/15 px-2.5 py-2 text-[9px] text-zinc-300 sm:text-[10px]">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500">Telegram (auto-kick)</p>
      <p className="mt-1 leading-relaxed text-zinc-500">
        You must be <span className="text-zinc-300">logged in to FarmLabs</span> in this browser. Connect Telegram so
        the bot can recognize you in the VIP group. When paid escrow access expires, the worker can remove members
        (listing needs a group chat id + bot admin).
      </p>
      {linked ? (
        <p className="mt-1.5 text-emerald-400/90">Linked{telegramIdHint ? ` (…${telegramIdHint})` : ""}.</p>
      ) : (
        <p className="mt-1.5 text-amber-400/90">Not linked to Telegram yet.</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void createLink()}
          disabled={loading}
          className="rounded border border-white/20 bg-zinc-900/80 px-2 py-1 text-[9px] font-medium text-zinc-100 disabled:opacity-50 sm:text-[10px]"
        >
          {loading ? "Creating link…" : "Create link"}
        </button>
        {linkUrl ? (
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded border border-white/15 px-2 py-1 text-[9px] text-zinc-400 sm:text-[10px]"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        ) : null}
      </div>
      {linkUrl ? (
        <p className="mt-1.5 break-all font-mono text-[8px] text-zinc-500">{linkUrl}</p>
      ) : null}
      {error ? <p className="mt-1 text-rose-400/90">{error}</p> : null}
    </div>
  );
}
