"use client";

import { shortSolanaAddress } from "@/lib/wallet-display";
import { Coins, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type AirdropPoolBalanceData = {
  wallet: string;
  mint: string;
  amount: number;
  decimals: number;
};

type Props = {
  tokenSymbol: string;
  target?: number;
  initial?: AirdropPoolBalanceData | null;
};

function formatTokenAmount(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return formatTokenAmount(n);
}

export function AirdropPoolBalance({ tokenSymbol, target = 1_000_000, initial = null }: Props) {
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

  const current = data?.amount ?? 0;
  const percent = useMemo(() => Math.min(100, (current / target) * 100), [current, target]);

  return (
    <div className="flex h-full min-h-[108px] w-full flex-col justify-center rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.1] via-emerald-500/[0.04] to-transparent px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <Coins className="h-3.5 w-3.5 text-emerald-400/90" strokeWidth={2} aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80">Reward pool</p>
        </div>
        {!loading || data != null ? (
          <p className="text-[11px] font-medium tabular-nums text-emerald-300/90">{percent.toFixed(1)}% filled</p>
        ) : null}
      </div>

      {loading && data == null ? (
        <div className="mt-4 flex justify-start">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300/70" aria-hidden />
        </div>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-xl font-bold tabular-nums tracking-tight text-white sm:text-2xl">
              {formatTokenAmount(current)}{" "}
              <span className="text-sm font-semibold text-emerald-300 sm:text-base">${tokenSymbol}</span>
            </p>
            <p className="text-[11px] tabular-nums text-zinc-500">
              of {formatTokenAmount(target)} ${tokenSymbol}
            </p>
          </div>

          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/[0.06]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.round(current)}
            aria-label={`Reward pool balance: ${formatTokenAmount(current)} of ${formatTokenAmount(target)} ${tokenSymbol}`}
          >
            <div
              className="relative h-full min-w-[2px] rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 transition-[width] duration-700 ease-out"
              style={{ width: `${percent}%` }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent"
                aria-hidden
              />
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] tabular-nums text-zinc-500">
            <span>0</span>
            <span>{formatCompact(target)} ${tokenSymbol}</span>
          </div>

          {data?.wallet ? (
            <p className="mt-2 font-mono text-[10px] text-zinc-600">{shortSolanaAddress(data.wallet)}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
