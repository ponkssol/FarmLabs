"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import Link from "next/link";

type ClaimState = {
  amount: number;
  status: string;
  txSignature: string | null;
  wallet: string;
} | null;

type Props = {
  isAuthenticated: boolean;
  savedWallet: string | null;
};

function formatAmount(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function AirdropPanel({ isAuthenticated, savedWallet }: Props) {
  const [claim, setClaim] = useState<ClaimState>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "earned" | "claimed">("idle");

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setBooting(false);
      return;
    }
    try {
      const res = await fetch("/api/airdrop/status");
      if (!res.ok) {
        setBooting(false);
        return;
      }
      const data = (await res.json()) as { claim: ClaimState };
      if (data.claim) {
        setClaim(data.claim);
        if (data.claim.status === "CLAIMED") {
          setPhase("claimed");
        } else if (data.claim.status === "PENDING") {
          setPhase("earned");
        }
      }
    } catch {
      /* ignore */
    } finally {
      setBooting(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onStart() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/airdrop/start", { method: "POST" });
      let data: {
        error?: string;
        amount?: number;
        status?: string;
        txSignature?: string | null;
        wallet?: string;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setMessage(`Server error (${res.status}). Restart dev server and run: npx prisma db push`);
        return;
      }
      if (!res.ok) {
        setMessage(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      if (data.amount != null && data.wallet && data.status) {
        setClaim({
          amount: data.amount,
          status: data.status,
          txSignature: data.txSignature ?? null,
          wallet: data.wallet,
        });
        if (data.status === "CLAIMED") {
          setPhase("claimed");
        } else {
          setPhase("earned");
        }
      }
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onClaim() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/airdrop/claim", { method: "POST" });
      let data: {
        error?: string;
        amount?: number;
        status?: string;
        txSignature?: string | null;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setMessage(`Server error (${res.status}). Check server logs.`);
        return;
      }
      if (!res.ok) {
        setMessage(data.error ?? `Claim failed (${res.status}).`);
        return;
      }
      if (data.amount != null && claim) {
        setClaim({
          ...claim,
          amount: data.amount,
          status: data.status ?? "CLAIMED",
          txSignature: data.txSignature ?? null,
        });
        setPhase("claimed");
      }
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-6 sm:p-8">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <Gift className="h-7 w-7 text-emerald-400" strokeWidth={1.75} aria-hidden />
          </div>
        </div>

        <h2 className="mt-5 text-center text-lg font-semibold text-white sm:text-xl">FarmLabs Airdrop</h2>
        <p className="mt-2 text-center text-xs leading-relaxed text-zinc-500 sm:text-sm">
          Tap Start to roll your reward, then claim FarmLabs tokens straight to your wallet.
        </p>

        {!isAuthenticated && (
          <p className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-amber-200/90 sm:text-sm">
            <Link href="/api/auth/signin" className="underline hover:text-white">
              Sign in
            </Link>{" "}
            with X or Telegram to participate.
          </p>
        )}

        {isAuthenticated && !savedWallet && (
          <p className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-amber-200/90 sm:text-sm">
            Connect your Solana wallet in the header before starting.
          </p>
        )}

        {phase === "idle" && isAuthenticated && savedWallet && (
          <button
            type="button"
            onClick={() => void onStart()}
            disabled={loading}
            className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Start
          </button>
        )}

        {phase === "earned" && claim && (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80">You earned</p>
              <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
                {formatAmount(claim.amount)}
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-400/90">FL</p>
            </div>
            <button
              type="button"
              onClick={() => void onClaim()}
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Claim tokens
            </button>
          </div>
        )}

        {phase === "claimed" && claim && (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80">Claimed</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-white">{formatAmount(claim.amount)} FL</p>
              <p className="mt-2 text-xs text-zinc-500">Sent to your wallet</p>
            </div>
            {claim.txSignature && (
              <a
                href={`https://solscan.io/tx/${claim.txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-emerald-400 underline hover:text-emerald-300"
              >
                View on Solscan
              </a>
            )}
          </div>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-center text-xs text-red-300 sm:text-sm">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
