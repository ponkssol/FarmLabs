"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

export function WalletLinkPanel() {
  const { publicKey, connect, disconnect, connected, connecting, wallet, select } = useWallet();
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
    try {
      if (!wallet) {
        select("Phantom" as WalletName);
        setMessage("Phantom selected. Click connect once more.");
        return;
      }
      await connect();
    } catch {
      setMessage("Failed to connect wallet. Make sure Phantom is installed and unlocked.");
    }
  }, [wallet, select, connect]);

  if (status === "unauthenticated" || !session) return null;

  const sameAsSaved = Boolean(
    session.user.wallet && publicKey && publicKey.toBase58() === session.user.wallet,
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Solana wallet</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            Connect Phantom and save your wallet address to verify ownership for project listings.
          </p>
        </div>
      </div>

      {session.user.wallet && (
        <p className="mt-4 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs break-all text-zinc-300">
          Saved wallet: {session.user.wallet}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!connected ? (
          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={connecting}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect wallet"}
          </button>
        ) : (
          <>
            <span className="max-w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs break-all text-zinc-400">
              {publicKey?.toBase58() ?? "-"}
            </span>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || !publicKey || sameAsSaved}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white transition hover:border-white/40 disabled:opacity-50"
            >
              {saving ? "Saving..." : sameAsSaved ? "Already saved" : "Save to profile"}
            </button>
            <button
              type="button"
              onClick={() => void onClear()}
              disabled={saving}
              className="text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              Remove wallet
            </button>
          </>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-zinc-400">{message}</p>}
    </div>
  );
}
