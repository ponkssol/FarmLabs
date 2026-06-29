"use client";

import { AIRDROP_POOL_REFRESH_EVENT, type AirdropPoolRefreshDetail } from "@/lib/airdrop-pool-refresh";
import { shortSolanaAddress } from "@/lib/wallet-display";
import { Coins, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const POOL_POLL_MS = 20_000;

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

function displaySymbol(symbol: string) {
  return symbol.startsWith("$") ? symbol : `$${symbol}`;
}

export function AirdropPoolBalance({ tokenSymbol, target = 1_000_000, initial = null }: Props) {
  const [data, setData] = useState<AirdropPoolBalanceData | null>(initial);
  const [loading, setLoading] = useState(initial == null);
  const sym = displaySymbol(tokenSymbol);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/airdrop/pool-balance", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as AirdropPoolBalanceData;
      setData(json);
    } catch {
      /* keep initial / last value */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    function onRefresh(event: Event) {
      const detail = (event as CustomEvent<AirdropPoolRefreshDetail>).detail;
      if (detail?.amountDeducted != null && detail.amountDeducted > 0) {
        setData((prev) =>
          prev ? { ...prev, amount: Math.max(0, prev.amount - detail.amountDeducted!) } : prev,
        );
      }
      void fetchBalance();
    }

    window.addEventListener(AIRDROP_POOL_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(AIRDROP_POOL_REFRESH_EVENT, onRefresh);
  }, [fetchBalance]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchBalance();
    }, POOL_POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchBalance]);

  const current = data?.amount ?? 0;
  const percent = useMemo(() => Math.min(100, (current / target) * 100), [current, target]);

  return (
    <div className="w-full rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] to-transparent px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Coins className="h-3 w-3 shrink-0 text-emerald-400/90" strokeWidth={2} aria-hidden />
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-400/75 sm:text-[10px]">
            Reward pool
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] tabular-nums text-zinc-500">
          {!loading || data != null ? (
            <span className="font-medium text-emerald-300/85">{percent.toFixed(1)}%</span>
          ) : null}
          {data?.wallet ? (
            <span className="hidden font-mono sm:inline">{shortSolanaAddress(data.wallet)}</span>
          ) : null}
        </div>
      </div>

      {loading && data == null ? (
        <div className="mt-2 flex justify-start py-0.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300/70" aria-hidden />
        </div>
      ) : (
        <>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-base font-semibold tabular-nums tracking-tight text-white sm:text-lg">
              {formatTokenAmount(current)}{" "}
              <span className="text-xs font-medium text-emerald-300/90 sm:text-sm">{sym}</span>
            </p>
            <p className="shrink-0 text-[10px] tabular-nums text-zinc-500">
              / {formatTokenAmount(target)} {sym}
            </p>
          </div>

          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/90"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.round(current)}
            aria-label={`Reward pool balance: ${formatTokenAmount(current)} of ${formatTokenAmount(target)} ${tokenSymbol}`}
          >
            <div
              className="h-full min-w-[2px] rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-700 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
