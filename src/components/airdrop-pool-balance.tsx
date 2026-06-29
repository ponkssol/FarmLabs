"use client";

import { shortSolanaAddress } from "@/lib/wallet-display";
import { Coins, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export type AirdropPoolBalanceData = {
  wallet: string;
  mint: string;
  amount: number;
  decimals: number;
};

type Props = {
  tokenSymbol: string;
  initial?: AirdropPoolBalanceData | null;
};

function formatTokenAmount(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function AirdropPoolBalance({ tokenSymbol, initial = null }: Props) {
  const [data, setData] = useState<AirdropPoolBalanceData | null>(initial);
  const [loading, setLoading] = useState(initial == null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/airdrop/pool-balance");
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as AirdropPoolBalanceData;
        if (!cancelled) setData(json);
      } catch {
        /* keep initial / last value */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-transparent px-4 py-3 sm:w-auto sm:min-w-[240px]">
      <div className="flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-emerald-400/90" strokeWidth={2} aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80">Reward pool</p>
      </div>

      {loading && data == null ? (
        <div className="mt-3 flex justify-center sm:justify-start">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300/70" aria-hidden />
        </div>
      ) : (
        <>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white">
            {formatTokenAmount(data?.amount ?? 0)}{" "}
            <span className="text-base font-semibold text-emerald-300">${tokenSymbol}</span>
          </p>
          {data?.wallet ? (
            <p className="mt-1 font-mono text-[10px] text-zinc-500">{shortSolanaAddress(data.wallet)}</p>
          ) : null}
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
            Sender balance for lucky box claims
          </p>
        </>
      )}
    </div>
  );
}
