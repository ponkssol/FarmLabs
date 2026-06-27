"use client";

import { WalletConnectExtras } from "@/components/solana/wallet-connect-extras";
import { useWalletConnect } from "@/hooks/use-wallet-connect";
import { shortSolanaAddress } from "@/lib/wallet-display";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Props = {
  isAuthenticated: boolean;
  hasXAccount: boolean;
  savedWallet: string | null;
  userId: string | null;
};

type WaitlistState = {
  joined: boolean;
  createdAt: string | null;
  wallet: string | null;
};

export function AirdropWaitlistPanel({ isAuthenticated, hasXAccount, savedWallet, userId }: Props) {
  const { connected, publicKey, connecting } = useWallet();
  const { connectWallet, hint, phantomOpenUrl, connecting: walletConnecting } = useWalletConnect();
  const [profileWallet, setProfileWallet] = useState<string | null>(savedWallet);
  const [waitlist, setWaitlist] = useState<WaitlistState>({ joined: false, createdAt: null, wallet: null });
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/airdrop/waitlist");
      if (!res.ok) {
        setBooting(false);
        return;
      }
      const data = (await res.json()) as {
        joined?: boolean;
        entry?: { createdAt: string; wallet: string } | null;
      };
      setWaitlist({
        joined: Boolean(data.joined),
        createdAt: data.entry?.createdAt ?? null,
        wallet: data.entry?.wallet ?? null,
      });
    } catch {
      /* ignore */
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setProfileWallet(savedWallet);
  }, [savedWallet]);

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
      };
      if (!res.ok) {
        setMessage(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      setWaitlist({
        joined: true,
        createdAt: data.createdAt ?? null,
        wallet: data.wallet ?? profileWallet,
      });
      setMessage(data.alreadyJoined ? "You are already on the waitlist." : "You joined the waitlist!");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || connecting || walletConnecting || savingWallet;
  const canJoin = isAuthenticated && hasXAccount && Boolean(profileWallet) && !waitlist.joined;

  return (
    <section className="flex h-full flex-col rounded-xl border border-white/10 bg-zinc-950/70 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10">
          <Users className="h-4 w-4 text-sky-400" strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Waitlist</p>
          <h2 className="text-base font-semibold text-white sm:text-lg">Join early access</h2>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500 sm:text-sm">
        Reserve your spot for the FarmLabs airdrop. You need an X account and a connected Solana wallet.
      </p>

      {booting ? (
        <div className="mt-8 flex flex-1 items-center justify-center py-8 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        </div>
      ) : waitlist.joined ? (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <Check className="h-5 w-5 text-emerald-400" strokeWidth={2} aria-hidden />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">You&apos;re on the waitlist</p>
            {waitlist.wallet ? (
              <p className="mt-1 font-mono text-xs text-zinc-500">{shortSolanaAddress(waitlist.wallet)}</p>
            ) : null}
            {waitlist.createdAt ? (
              <p className="mt-2 text-[11px] text-zinc-600">
                Joined {new Date(waitlist.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-1 flex-col">
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
            waitlist.joined && !message.includes("already")
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/90"
              : "border-amber-500/20 bg-amber-500/5 text-amber-200/90"
          }`}
        >
          {message}
        </p>
      ) : null}

      {!waitlist.joined && canJoin ? (
        <p className="mt-3 text-center text-[11px] text-zinc-600">Ready — tap Join waitlist to save your spot.</p>
      ) : null}
    </section>
  );
}
