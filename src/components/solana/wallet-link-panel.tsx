"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { resultToPanelMessage, runPhantomConnectFlow } from "@/lib/solana-phantom-connect";
import { shortSolanaAddress } from "@/lib/wallet-display";

type PanelProps = {
  /** Tighter padding and type scale for embedded dashboard sidebar */
  compact?: boolean;
  /** No outer card — sits inside dashboard profile card; address shown here when saved */
  inProfile?: boolean;
};

export function WalletLinkPanel({ compact = false, inProfile = false }: PanelProps) {
  const { publicKey, connect, disconnect, connected, connecting, wallet, wallets, select } = useWallet();
  const { data: session, update, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSave = useCallback(async () => {
    if (!publicKey) return;
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/me/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || "Failed to save wallet");
      await update();
      setMessage("Wallet address saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }, [publicKey, update]);

  const onClear = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/me/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: null }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Failed to remove wallet");
      }
      await disconnect();
      await update();
      setMessage("Wallet removed from profile.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }, [disconnect, update]);

  const onConnect = useCallback(async () => {
    setMessage(null);
    const r = await runPhantomConnectFlow({ wallet, wallets, select, connect });
    const m = resultToPanelMessage(r);
    if (m) setMessage(m);
  }, [wallet, wallets, select, connect]);

  if (status === "unauthenticated" || !session) return null;

  const sameAsSaved = Boolean(
    session.user.wallet && publicKey && publicKey.toBase58() === session.user.wallet,
  );

  const tight = compact || inProfile;

  return (
    <div
      className={
        inProfile
          ? "mt-2.5 space-y-2 border-t border-white/5 pt-2.5"
          : compact
            ? "rounded-lg border border-white/10 bg-zinc-950/50 p-2.5"
            : "rounded-2xl border border-white/10 bg-zinc-950 p-6"
      }
    >
      {inProfile ? (
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs sm:tracking-[0.16em]">
          Wallet
        </p>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className={
                compact
                  ? "text-xs font-semibold uppercase tracking-widest text-zinc-500"
                  : "text-sm font-semibold uppercase tracking-widest text-zinc-500"
              }
            >
              Solana wallet
            </h2>
            <p
              className={
                compact
                  ? "mt-1.5 text-xs leading-relaxed text-zinc-500 sm:text-sm"
                  : "mt-2 max-w-xl text-sm leading-relaxed text-zinc-400"
              }
            >
              {compact
                ? "Connect Phantom and save your address for listings."
                : "Connect Phantom and save your wallet address to verify ownership for project listings."}
            </p>
          </div>
        </div>
      )}

      {inProfile && !session.user.wallet && (
        <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">
          Connect Phantom and save to verify your listings.
        </p>
      )}

      {session.user.wallet && !inProfile && (
        <p
          className={
            compact
              ? "mt-2 rounded border border-white/10 bg-zinc-900 px-2 py-1 font-mono text-xs break-all text-zinc-300 sm:text-xs"
              : "mt-4 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs break-all text-zinc-300"
          }
        >
          {compact ? session.user.wallet : `Saved wallet: ${session.user.wallet}`}
        </p>
      )}

      {session.user.wallet && inProfile && !connected && (
        <p
          className="max-w-full rounded border border-white/8 bg-zinc-900/80 px-2 py-1 font-mono text-xs text-zinc-200 sm:text-xs"
          title={session.user.wallet}
        >
          {shortSolanaAddress(session.user.wallet)}
        </p>
      )}

      <div
        className={
          inProfile
            ? "mt-0 flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center"
            : tight
              ? "mt-2 flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center"
              : "mt-5 flex flex-wrap items-center gap-3"
        }
      >
        {!connected ? (
          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={connecting}
            className={
              inProfile
                ? "w-full rounded-md border border-white/20 bg-white px-2.5 py-1.5 text-center text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50 sm:w-auto"
                : tight
                ? "w-full rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50 sm:w-auto"
                : "rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
            }
          >
            {connecting ? (tight ? "…" : "Connecting...") : inProfile && session.user.wallet ? "Connect other wallet" : "Connect wallet"}
          </button>
        ) : (
          <>
            <span
              className={
                inProfile
                  ? "block max-w-full rounded border border-white/8 bg-zinc-900/80 px-2 py-1 font-mono text-xs break-all text-zinc-200 sm:text-xs"
                  : tight
                  ? "block max-w-full rounded border border-white/10 bg-zinc-900 px-2 py-1 font-mono text-xs break-all text-zinc-400 sm:text-xs"
                  : "max-w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs break-all text-zinc-400"
              }
              title={publicKey?.toBase58() ?? ""}
            >
              {inProfile ? (publicKey ? shortSolanaAddress(publicKey.toBase58()) : "—") : (publicKey?.toBase58() ?? "-")}
            </span>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || !publicKey || sameAsSaved}
              className={
                inProfile
                  ? "shrink-0 rounded border border-white/20 px-2 py-1.5 text-xs text-white transition hover:border-white/40 disabled:opacity-50"
                  : tight
                  ? "rounded border border-white/20 px-2 py-1 text-xs text-white transition hover:border-white/40 disabled:opacity-50"
                  : "rounded-lg border border-white/20 px-3 py-2 text-sm text-white transition hover:border-white/40 disabled:opacity-50"
              }
            >
              {saving ? (tight ? "…" : "Saving...") : sameAsSaved ? (tight ? "Saved" : "Already saved") : "Save to profile"}
            </button>
            <button
              type="button"
              onClick={() => void onClear()}
              disabled={saving}
              className={
                inProfile
                  ? "self-start text-left text-xs text-zinc-500 sm:text-xs"
                  : tight
                  ? "text-left text-xs text-zinc-500 sm:text-xs"
                  : "text-xs text-zinc-500 transition hover:text-zinc-300"
              }
            >
              {tight ? "Remove" : "Remove wallet"}
            </button>
          </>
        )}
      </div>

      {message && (
        <p
          className={
            inProfile
              ? "mt-0.5 text-xs text-zinc-500 sm:text-xs"
              : tight
                ? "mt-1.5 text-xs text-zinc-500 sm:text-sm"
                : "mt-3 text-sm text-zinc-400"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
