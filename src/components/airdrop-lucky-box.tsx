"use client";

import type { LuckyBoxState } from "@/lib/airdrop-luckybox";
import { Gift, Loader2, Sparkles, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

type Props = {
  luckyBox: LuckyBoxState;
  tokenSymbol: string;
  onLuckyBoxChange: (next: LuckyBoxState) => void;
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

export function AirdropLuckyBox({ luckyBox, tokenSymbol, onLuckyBoxChange }: Props) {
  const [box, setBox] = useState(luckyBox);
  const [loading, setLoading] = useState<"open" | "claim" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    setLoading("open");
    setOpenPhase("shaking");

    try {
      const [res] = await Promise.all([
        fetch("/api/airdrop/luckybox/open", { method: "POST" }),
        delay(900),
      ]);
      const data = (await res.json()) as { error?: string; luckyBox?: LuckyBoxState };

      if (!res.ok || !data.luckyBox) {
        setOpenPhase("closed");
        setMessage(data.error ?? "Could not open lucky box.");
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
    } finally {
      setLoading(null);
    }
  }

  async function onClaim() {
    setMessage(null);
    setLoading("claim");
    try {
      const res = await fetch("/api/airdrop/luckybox/claim", { method: "POST" });
      const data = (await res.json()) as { error?: string; luckyBox?: LuckyBoxState };
      if (!res.ok || !data.luckyBox) {
        setMessage(data.error ?? "Claim failed.");
        return;
      }
      syncBox(data.luckyBox);
      setMessage(data.luckyBox.status === "CLAIMED" ? "Tokens sent to your wallet!" : null);
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(null);
    }
  }

  const isReady = box.status === "READY" || box.status === "FAILED";
  const isOpened = box.status === "OPENED";
  const isClaimed = box.status === "CLAIMED";
  const showBox = isReady || openPhase !== "revealed" || rolling;
  const showReward = (isOpened || isClaimed || rolling || openPhase === "revealed") && displayAmount != null;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.07] to-zinc-950/40 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
          <Gift className="h-4 w-4 text-amber-300" strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400/80 sm:text-xs">
            Lucky box
          </p>
          <h3 className="text-sm font-semibold text-white sm:text-base">Your waitlist reward</h3>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
        Open the box to reveal your {tokenSymbol} token reward, then claim it to your connected wallet.
      </p>

      <div className="mt-5 flex flex-col items-center">
        {isReady && showBox ? (
          <>
            <LuckyBoxVisual phase={openPhase} />
            <button
              type="button"
              onClick={() => void onOpen()}
              disabled={loading !== null || openPhase !== "closed"}
              className="mt-5 flex h-10 w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
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
            className={`w-full max-w-xs text-center ${justRevealed ? "lucky-box-reveal-pop" : ""}`}
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
                disabled={loading !== null}
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
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-center text-xs text-amber-100/90 sm:text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
