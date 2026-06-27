"use client";

import { AirdropPanelCard } from "@/components/airdrop-panel-card";
import { WalletConnectExtras } from "@/components/solana/wallet-connect-extras";
import { useWalletConnect } from "@/hooks/use-wallet-connect";
import type { LuckyBoxState } from "@/lib/airdrop-luckybox";
import { shortSolanaAddress } from "@/lib/wallet-display";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_LUCKY_BOX: LuckyBoxState = {
  status: "READY",
  amount: null,
  openedAt: null,
  claimedAt: null,
  txSignature: null,
};

type Props = {
  isAuthenticated: boolean;
  hasXAccount: boolean;
  savedWallet: string | null;
  userId: string | null;
  tokenSymbol: string;
  joined: boolean;
  wallet: string | null;
  createdAt: string | null;
  onJoined: (entry: { wallet: string; createdAt: string; luckyBox: LuckyBoxState }) => void;
};

export function AirdropWaitlistPanel({
  isAuthenticated,
  hasXAccount,
  savedWallet,
  userId,
  tokenSymbol,
  joined,
  wallet,
  createdAt,
  onJoined,
}: Props) {
  const { connected, publicKey, connecting } = useWallet();
  const { connectWallet, hint, phantomOpenUrl, connecting: walletConnecting } = useWalletConnect();
  const [profileWallet, setProfileWallet] = useState<string | null>(savedWallet);
  const [loading, setLoading] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setProfileWallet(savedWallet);
  }, [savedWallet]);

  const syncFromApi = useCallback(async () => {
    try {
      const res = await fetch("/api/airdrop/waitlist");
      if (!res.ok) return;
      const data = (await res.json()) as {
        joined?: boolean;
        entry?: {
          createdAt: string;
          wallet: string;
          luckyBox?: LuckyBoxState;
        } | null;
      };
      if (data.joined && data.entry) {
        onJoined({
          wallet: data.entry.wallet,
          createdAt: data.entry.createdAt,
          luckyBox: data.entry.luckyBox ?? DEFAULT_LUCKY_BOX,
        });
      }
    } catch {
      /* ignore */
    }
  }, [onJoined]);

  useEffect(() => {
    if (joined) return;
    void syncFromApi();
  }, [joined, syncFromApi]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (!connected || !publicKey) return;
    if (profileWallet) return;

    let cancelled = false;
    setSavingWallet(true);
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
        /* user can retry via connect */
      } finally {
        if (!cancelled) setSavingWallet(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, profileWallet, connected, publicKey]);

  async function saveWalletIfNeeded(): Promise<boolean> {
    if (profileWallet) return true;
    if (!connected || !publicKey) return false;

    setSavingWallet(true);
    try {
      const addr = publicKey.toBase58();
      const r = await fetch("/api/me/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr }),
      });
      if (!r.ok) return false;
      setProfileWallet(addr);
      return true;
    } catch {
      return false;
    } finally {
      setSavingWallet(false);
    }
  }

  async function onJoinWaitlist() {
    setMessage(null);

    if (!isAuthenticated) {
      setMessage("Sign in with X first, then connect your wallet to join the waitlist.");
      return;
    }

    if (!hasXAccount) {
      setMessage("Waitlist requires an X (Twitter) account. Sign out and sign in with X to continue.");
      return;
    }

    if (!profileWallet) {
      if (!connected) {
        setMessage("Connect your Solana wallet first, then tap Join waitlist again.");
        await connectWallet();
        return;
      }
      const saved = await saveWalletIfNeeded();
      if (!saved) {
        setMessage("Could not save your wallet. Connect again from the header, then retry.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/airdrop/waitlist", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        joined?: boolean;
        alreadyJoined?: boolean;
        createdAt?: string;
        wallet?: string;
        luckyBox?: LuckyBoxState;
      };
      if (!res.ok) {
        setMessage(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      onJoined({
        wallet: data.wallet ?? profileWallet ?? "",
        createdAt: data.createdAt ?? new Date().toISOString(),
        luckyBox: data.luckyBox ?? DEFAULT_LUCKY_BOX,
      });
      setMessage(data.alreadyJoined ? "You are already on the waitlist." : "You joined the waitlist!");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || connecting || walletConnecting || savingWallet;
  const canJoin = isAuthenticated && hasXAccount && Boolean(profileWallet) && !joined;

  return (
    <AirdropPanelCard
      icon={Users}
      accent="sky"
      eyebrow="Waitlist"
      title="Join early access"
      description="Reserve your spot for the FarmLabs airdrop. Sign in with X and connect your Solana wallet to join."
      bodyClassName="justify-between"
    >
      {joined ? (
        <div className="flex flex-1 flex-col justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-4 text-center sm:px-4">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={2} aria-hidden />
          </div>
          <p className="mt-2 text-sm font-semibold text-white">You&apos;re on the waitlist</p>
          {wallet ? (
            <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{shortSolanaAddress(wallet)}</p>
          ) : null}
          {createdAt ? (
            <p className="mt-1 text-[11px] text-zinc-600">
              Joined {new Date(createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-emerald-300/80 lg:hidden">Open your lucky box below ↓</p>
          <p className="mt-3 hidden text-xs text-emerald-300/80 lg:block">Open your lucky box on the right →</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <ul className="space-y-2 text-xs text-zinc-500 sm:text-sm">
            <li className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${isAuthenticated && hasXAccount ? "bg-emerald-400" : "bg-zinc-600"}`}
                aria-hidden
              />
              Sign in with X
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${profileWallet ? "bg-emerald-400" : "bg-zinc-600"}`}
                aria-hidden
              />
              Connect Solana wallet
              {profileWallet ? (
                <span className="font-mono text-[11px] text-zinc-600">({shortSolanaAddress(profileWallet)})</span>
              ) : null}
            </li>
          </ul>

          <button
            type="button"
            onClick={() => void onJoinWaitlist()}
            disabled={busy}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Join waitlist
          </button>

          {!isAuthenticated ? (
            <Link
              href="/login?callbackUrl=/airdrop"
              className="mt-3 block text-center text-xs text-sky-400 underline hover:text-sky-300"
            >
              Sign in with X
            </Link>
          ) : null}

          {isAuthenticated && !hasXAccount ? (
            <p className="mt-3 text-center text-xs text-amber-200/85">
              Your account is not linked to X. Sign out and sign in with X to join.
            </p>
          ) : null}

          {isAuthenticated && hasXAccount && !profileWallet ? (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Tap Join waitlist to connect your wallet, or use Connect in the header.
            </p>
          ) : null}

          <WalletConnectExtras hint={hint} phantomUrl={phantomOpenUrl} align="left" />
        </div>
      )}

      {message ? (
        <p
          className={`mt-4 rounded-lg border px-3 py-2.5 text-center text-xs sm:text-sm ${
            joined && !message.includes("already")
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/90"
              : "border-amber-500/20 bg-amber-500/5 text-amber-200/90"
          }`}
        >
          {message}
        </p>
      ) : null}

      {!joined && canJoin ? (
        <p className="mt-3 text-center text-[11px] text-zinc-600">Ready — tap Join waitlist to save your spot.</p>
      ) : null}
    </AirdropPanelCard>
  );
}
