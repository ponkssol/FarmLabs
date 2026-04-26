"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { resultToPanelMessage, runPhantomConnectFlow } from "@/lib/solana-phantom-connect";

export function HeaderWalletConnect() {
  const { data: session, status } = useSession();
  const { connect, wallet, select, connected, connecting, publicKey } = useWallet();
  const [hint, setHint] = useState<string | null>(null);

  const onConnect = useCallback(async () => {
    setHint(null);
    const r = await runPhantomConnectFlow({ wallet, select, connect });
    const m = resultToPanelMessage(r);
    if (m) setHint(m);
  }, [wallet, select, connect]);

  if (status === "loading") {
    return <span className="h-7 w-16 shrink-0 animate-pulse rounded-md bg-zinc-800/80" aria-hidden />;
  }

  if (status !== "authenticated" || !session) {
    return null;
  }

  if (connected && publicKey) {
    const s = publicKey.toBase58();
    const short = s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
    return (
      <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-2.5">
        <span
          className="max-w-[100px] shrink truncate font-mono text-[10px] text-zinc-400 sm:max-w-[140px] sm:text-[11px]"
          title={s}
        >
          {short}
        </span>
        <Link
          href="/dashboard"
          className="shrink-0 text-[10px] text-zinc-500 transition hover:text-zinc-300 sm:text-xs"
        >
          Save
        </Link>
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
        className="rounded-md border border-emerald-500/25 bg-emerald-950/35 px-2 py-1.5 text-[10px] font-medium text-emerald-200/90 transition hover:border-emerald-500/45 hover:bg-emerald-950/50 disabled:opacity-50 sm:px-2.5 sm:text-xs"
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
