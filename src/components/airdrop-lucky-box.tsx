"use client";

import { AirdropAlertBanner } from "@/components/airdrop-alert-banner";
import { AirdropPanelCard } from "@/components/airdrop-panel-card";
import { useWalletConnect } from "@/hooks/use-wallet-connect";
import type { LuckyBoxState } from "@/lib/airdrop-luckybox";
import { formatSolanaClaimError } from "@/lib/solana-claim-error";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { Gift, Loader2, Sparkles, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

type Props = {
  luckyBox: LuckyBoxState;
  tokenSymbol: string;
  savedWallet: string | null;
  onLuckyBoxChange: (next: LuckyBoxState) => void;
  className?: string;
};

type OpenPhase = "closed" | "shaking" | "burst" | "rolling" | "revealed";

function formatAmount(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function randomRoll(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 52 + (i % 3) * 14;
  return {
    id: i,
    x: `${Math.cos(angle) * dist}px`,
    y: `${Math.sin(angle) * dist}px`,
    color: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f97316" : "#fde68a",
  };
});

function LuckyBoxVisual({ phase }: { phase: OpenPhase }) {
  const isClosed = phase === "closed";
  const isShaking = phase === "shaking";
  const isOpening = phase === "burst" || phase === "rolling" || phase === "revealed";
  const lidOpen = phase === "burst" || phase === "rolling" || phase === "revealed";

  return (
    <div
      className={`relative mx-auto h-36 w-36 sm:h-40 sm:w-40 ${isClosed ? "lucky-box-float" : ""} ${
        isShaking ? "lucky-box-shake" : ""
      }`}
      style={{ perspective: "520px" }}
    >
      {(phase === "burst" || phase === "rolling") && (
        <>
          <div
            className="lucky-box-glow-ring pointer-events-none absolute inset-2 rounded-2xl border-2 border-amber-300/60"
            aria-hidden
          />
          {PARTICLES.map((p) => (
            <span
              key={p.id}
              className="lucky-box-particle pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
              style={
                {
                  backgroundColor: p.color,
                  "--lucky-x": p.x,
                  "--lucky-y": p.y,
                  animationDelay: `${p.id * 35}ms`,
                } as CSSProperties
              }
              aria-hidden
            />
          ))}
        </>
      )}

      <div className="relative mx-auto h-full w-full" style={{ transformStyle: "preserve-3d" }}>
        {/* Box lid */}
        <div
          className={`absolute left-1/2 top-[18%] z-20 h-[22%] w-[78%] -translate-x-1/2 origin-bottom rounded-t-xl border-2 border-amber-300/50 bg-gradient-to-b from-amber-300/90 to-amber-500/80 shadow-[0_4px_20px_rgba(251,191,36,0.35)] ${
            lidOpen ? "lucky-box-lid-open" : ""
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-950/70" strokeWidth={2} aria-hidden />
          </div>
        </div>

        {/* Box body */}
        <div
          className={`absolute bottom-0 left-1/2 z-10 h-[68%] w-[78%] -translate-x-1/2 rounded-b-xl rounded-t-md border-2 border-amber-400/45 bg-gradient-to-br from-amber-500/35 via-amber-600/20 to-orange-700/30 shadow-[0_0_48px_rgba(245,158,11,0.2),inset_0_1px_0_rgba(255,255,255,0.12)] ${
            isOpening ? "shadow-[0_0_60px_rgba(251,191,36,0.45)]" : ""
          }`}
        >
          <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
            {phase === "closed" || phase === "shaking" ? (
              <>
                <Gift className="h-10 w-10 text-amber-200/90 sm:h-11 sm:w-11" strokeWidth={1.5} aria-hidden />
                {phase === "shaking" ? (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/80">
                    Opening…
                  </span>
                ) : null}
              </>
            ) : null}
            {(phase === "burst" || phase === "rolling") && (
              <div className="flex flex-col items-center">
                <Star className="h-6 w-6 animate-spin text-amber-200/90" strokeWidth={1.5} aria-hidden />
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-amber-100/90">
                  {phase === "rolling" ? "Rolling…" : "…"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AirdropLuckyBox({
  luckyBox,
  tokenSymbol,
  savedWallet,
  onLuckyBoxChange,
  className = "",
}: Props) {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction, connecting } = useWallet();
  const { connectWallet } = useWalletConnect();
  const [box, setBox] = useState(luckyBox);
  const [loading, setLoading] = useState<"open" | "claim" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<OpenPhase>(
    luckyBox.status === "READY" || luckyBox.status === "FAILED" ? "closed" : "revealed",
  );
  const [displayAmount, setDisplayAmount] = useState<number | null>(
    luckyBox.status !== "READY" && luckyBox.status !== "FAILED" ? luckyBox.amount : null,
  );
  const [rolling, setRolling] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setBox(luckyBox);
    if (luckyBox.status === "READY" || luckyBox.status === "FAILED") {
      setOpenPhase("closed");
      setDisplayAmount(null);
      setJustRevealed(false);
    } else {
      setOpenPhase("revealed");
      setDisplayAmount(luckyBox.amount);
    }
  }, [luckyBox]);

  useEffect(() => {
    return () => {
      if (rollTimer.current) clearInterval(rollTimer.current);
    };
  }, []);

  const syncBox = useCallback(
    (next: LuckyBoxState) => {
      setBox(next);
      onLuckyBoxChange(next);
    },
    [onLuckyBoxChange],
  );

  function runRollAnimation(finalAmount: number): Promise<void> {
    return new Promise((resolve) => {
      setRolling(true);
      setOpenPhase("rolling");
      setDisplayAmount(randomRoll(50, 500));
      let ticks = 0;
      rollTimer.current = setInterval(() => {
        ticks += 1;
        setDisplayAmount(randomRoll(50, 500));
        if (ticks >= 22) {
          if (rollTimer.current) clearInterval(rollTimer.current);
          setDisplayAmount(finalAmount);
          setRolling(false);
          setOpenPhase("revealed");
          setJustRevealed(true);
          resolve();
        }
      }, 65);
    });
  }

  async function onOpen() {
    if (loading !== null || openPhase !== "closed") return;
    setMessage(null);
    setErrorReason(null);
    setLoading("open");
    setOpenPhase("shaking");

    try {
      const [res] = await Promise.all([
        fetch("/api/airdrop/luckybox/open", { method: "POST" }),
        delay(900),
      ]);
      const data = (await res.json()) as { error?: string; reason?: string; luckyBox?: LuckyBoxState };

      if (!res.ok || !data.luckyBox) {
        setOpenPhase("closed");
        setMessage(data.error ?? "Could not open lucky box.");
        setErrorReason(data.reason ?? "Something went wrong while opening your lucky box. Please try again.");
        return;
      }

      syncBox(data.luckyBox);
      setOpenPhase("burst");
      await delay(650);

      if (data.luckyBox.amount != null) {
        await runRollAnimation(data.luckyBox.amount);
      }
    } catch {
      setOpenPhase("closed");
      setMessage("Network error. Try again.");
      setErrorReason("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  async function onClaim() {
    setMessage(null);
    setErrorReason(null);

    if (!savedWallet) {
      setMessage("Connect and save your Solana wallet before claiming.");
      setErrorReason("Use Connect in the header, then try again.");
      return;
    }

    if (!connected || !publicKey || !sendTransaction) {
      setMessage("Connect your wallet to claim.");
      setErrorReason("You sign the claim transaction and pay the network fee from your wallet.");
      await connectWallet();
      return;
    }

    if (publicKey.toBase58() !== savedWallet) {
      setMessage("Wrong wallet connected.");
      setErrorReason(`Switch to ${savedWallet.slice(0, 4)}…${savedWallet.slice(-4)} — the wallet saved on your profile.`);
      return;
    }

    setLoading("claim");
    try {
      const prepareRes = await fetch("/api/airdrop/luckybox/claim/prepare", { method: "POST" });
      const prepare = (await prepareRes.json()) as {
        error?: string;
        reason?: string;
        transaction?: string;
        blockhash?: string;
        lastValidBlockHeight?: number;
      };

      if (!prepareRes.ok || !prepare.transaction || !prepare.blockhash || prepare.lastValidBlockHeight == null) {
        setMessage(prepare.error ?? "Claim failed.");
        setErrorReason(prepare.reason ?? null);
        return;
      }

      const tx = Transaction.from(Buffer.from(prepare.transaction, "base64"));
      let signature: string;
      try {
        signature = await sendTransaction(tx, connection, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 3,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (/User rejected|cancel|denied/i.test(msg)) {
          setMessage("Transaction cancelled.");
          setErrorReason("You declined the wallet signature request.");
          return;
        }
        const formatted = formatSolanaClaimError(e);
        setMessage(formatted.message);
        setErrorReason(formatted.reason);
        return;
      }

      await connection.confirmTransaction(
        {
          signature,
          blockhash: prepare.blockhash,
          lastValidBlockHeight: prepare.lastValidBlockHeight,
        },
        "confirmed",
      );

      const confirmRes = await fetch("/api/airdrop/luckybox/claim/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const data = (await confirmRes.json()) as { error?: string; reason?: string; luckyBox?: LuckyBoxState };
      if (!confirmRes.ok || !data.luckyBox) {
        setMessage(data.error ?? "Claim failed.");
        setErrorReason(data.reason ?? null);
        return;
      }

      syncBox(data.luckyBox);
      setMessage(data.luckyBox.status === "CLAIMED" ? "Tokens sent to your wallet!" : null);
      setErrorReason(null);
    } catch {
      setMessage("Network error. Try again.");
      setErrorReason("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  const isReady = box.status === "READY" || box.status === "FAILED";
  const isOpened = box.status === "OPENED";
  const isClaimed = box.status === "CLAIMED";
  const showBox = isReady || openPhase !== "revealed" || rolling;
  const showReward = (isOpened || isClaimed || rolling || openPhase === "revealed") && displayAmount != null;
  const isSuccessMessage = Boolean(message && message.toLowerCase().includes("sent to your wallet"));

  return (
    <AirdropPanelCard
      icon={Gift}
      accent="amber"
      eyebrow="Lucky box"
      title="Your waitlist reward"
      description={`Open the box to reveal your ${tokenSymbol} token reward, then claim it to your connected wallet. You pay the network fee when claiming.`}
      className={className}
      bodyClassName="items-center justify-center"
    >
      <div className="flex w-full flex-col items-center">
        {isReady && showBox ? (
          <>
            <LuckyBoxVisual phase={openPhase} />
            <button
              type="button"
              onClick={() => void onOpen()}
              disabled={loading !== null || openPhase !== "closed"}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {loading === "open" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {openPhase === "shaking" || openPhase === "burst" || openPhase === "rolling"
                ? "Opening…"
                : box.status === "FAILED"
                  ? "Try open again"
                  : "Open lucky box"}
            </button>
          </>
        ) : null}

        {!isReady && openPhase !== "closed" && openPhase !== "revealed" && !showReward ? (
          <LuckyBoxVisual phase={openPhase} />
        ) : null}

        {showReward ? (
          <div
            className={`w-full text-center ${justRevealed ? "lucky-box-reveal-pop" : ""}`}
            onAnimationEnd={() => setJustRevealed(false)}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
              {isClaimed ? "You claimed" : rolling ? "Rolling…" : "You won"}
            </p>
            <p
              className={`mt-2 bg-gradient-to-b from-white to-amber-100 bg-clip-text text-4xl font-bold tabular-nums tracking-tight text-transparent sm:text-5xl ${
                rolling ? "lucky-box-number-roll" : ""
              }`}
            >
              {formatAmount(displayAmount)}
            </p>
            <p className="mt-1 text-sm font-medium text-amber-300">{tokenSymbol}</p>

            {isOpened && !rolling && openPhase === "revealed" ? (
              <button
                type="button"
                onClick={() => void onClaim()}
                disabled={loading !== null || connecting}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {loading === "claim" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Claim {formatAmount(displayAmount)} {tokenSymbol}
              </button>
            ) : null}

            {isClaimed ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-emerald-300/90">Sent to your saved wallet</p>
                {box.txSignature ? (
                  <a
                    href={`https://solscan.io/tx/${box.txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-sky-400 underline hover:text-sky-300"
                  >
                    View on Solscan
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {message ? (
        <AirdropAlertBanner
          message={message}
          reason={errorReason}
          variant={isSuccessMessage ? "success" : "warning"}
        />
      ) : null}
    </AirdropPanelCard>
  );
}
