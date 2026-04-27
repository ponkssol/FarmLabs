"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { resultToPanelMessage, runPhantomConnectFlow } from "@/lib/solana-phantom-connect";

function formatNativeSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol === 0) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: sol < 1 ? 5 : 4,
  }).format(sol);
}

/**
 * Buy / listing APIs require `User.wallet` in the database (session), not only a browser connection.
 * When the user has connected Phantom but never opened Dashboard "Save", sync their address here.
 */
type HeaderWalletConnectProps = {
  isAuthenticated: boolean;
  userId: string | null;
  savedWallet: string | null;
};

export function HeaderWalletConnect({ isAuthenticated, userId, savedWallet }: HeaderWalletConnectProps) {
  const { connection } = useConnection();
  const { connect, wallet, wallets, select, connected, connecting, publicKey } = useWallet();
  const [hint, setHint] = useState<string | null>(null);
  const [savingProfileWallet, setSavingProfileWallet] = useState(false);
  const [profileWallet, setProfileWallet] = useState<string | null>(savedWallet);
  const [balanceLamports, setBalanceLamports] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (!connected || !publicKey) return;
    if (profileWallet) return;

    let cancelled = false;
    setSavingProfileWallet(true);
    const addr = publicKey.toBase58();
    void (async () => {
      try {
        const r = await fetch("/api/me/wallet", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: addr }),
        });
        if (!r.ok || cancelled) return;
        setProfileWallet(addr);
      } catch {
        /* allow manual Save on dashboard */
      } finally {
        if (!cancelled) setSavingProfileWallet(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, profileWallet, connected, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setBalanceLamports(null);
      setBalanceError(false);
      return;
    }
    let cancelled = false;
    const fetchBalance = () => {
      void connection
        .getBalance(publicKey, { commitment: "confirmed" })
        .then((lamports) => {
          if (!cancelled) {
            setBalanceLamports(lamports);
            setBalanceError(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setBalanceLamports(null);
            setBalanceError(true);
          }
        });
    };
    fetchBalance();
    const t = setInterval(fetchBalance, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [connection, publicKey, connected]);

  const onConnect = useCallback(async () => {
    setHint(null);
    const r = await runPhantomConnectFlow({ wallet, wallets, select, connect });
    const m = resultToPanelMessage(r);
    if (m) setHint(m);
  }, [wallet, wallets, select, connect]);

  if (!isAuthenticated) {
    return null;
  }

  if (connected && publicKey) {
    return (
      <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-2.5">
        <span
          className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 tabular-nums text-[11px] font-medium text-zinc-300 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm"
          title="Native SOL balance (wallet)"
        >
          {balanceError ? "—" : balanceLamports === null ? "…" : formatNativeSol(balanceLamports)}
          <span className="hidden sm:inline"> SOL</span>
        </span>
        {savingProfileWallet ? (
          <span
            className="hidden shrink-0 text-xs text-amber-200/80 sm:inline sm:text-sm"
            title="Saving address to your profile (required for escrow checkout)"
          >
            Saving…
          </span>
        ) : !profileWallet ? (
          <Link
            href="/dashboard"
            className="hidden shrink-0 text-xs text-amber-200/80 underline decoration-white/20 sm:inline sm:text-sm"
            title="Open dashboard to save your wallet to your profile"
          >
            Save to profile
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => void onConnect()}
        disabled={connecting}
        title={hint ?? "Connect Phantom"}
        className="rounded-md border border-emerald-500/25 bg-emerald-950/35 px-2 py-1.5 text-xs font-medium text-emerald-200/90 transition hover:border-emerald-500/45 hover:bg-emerald-950/50 disabled:opacity-50 sm:px-2.5 sm:text-sm"
      >
        {connecting ? (
          "…"
        ) : (
          <>
            <span className="sm:hidden">Wallet</span>
            <span className="hidden sm:inline">Connect wallet</span>
          </>
        )}
      </button>
    </div>
  );
}
