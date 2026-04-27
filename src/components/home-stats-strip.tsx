"use client";

import { useEffect, useRef, useState } from "react";

type StatItem = {
  id: string;
  prefix?: string;
  target: number;
  suffix?: string;
  label: string;
};

const STATS: StatItem[] = [
  { id: "volume", prefix: "$", target: 950, suffix: "k+", label: "Escrowed volume" },
  { id: "calls", target: 1200, suffix: "+", label: "Public + private calls" },
  { id: "api", prefix: "<", target: 300, suffix: "ms", label: "API response" },
  { id: "active", target: 24, suffix: "/7", label: "Degen activity" },
];

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function HomeStatsStrip() {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(STATS.map((s) => [s.id, 0])),
  );
  const [started, setStarted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || started) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const durationMs = 1400;
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      setCounts(
        Object.fromEntries(
          STATS.map((s) => [s.id, Math.round(s.target * eased)]),
        ),
      );
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [started]);

  return (
    <div ref={rootRef} className="grid grid-cols-2 border-t border-white/10 bg-black/40 text-center sm:grid-cols-4">
      {STATS.map((s, idx) => (
        <div
          key={s.id}
          className={[
            "px-3 py-4",
            idx === 0 ? "border-b border-r border-white/10 sm:border-b-0" : "",
            idx === 1 ? "border-b border-white/10 sm:border-b-0 sm:border-r" : "",
            idx === 2 ? "border-r border-white/10" : "",
          ]
            .join(" ")
            .trim()}
        >
          <p className="text-lg font-semibold text-white tabular-nums">
            {s.prefix ?? ""}
            {new Intl.NumberFormat("en-US").format(counts[s.id] ?? 0)}
            {s.suffix ?? ""}
          </p>
          <p className="text-sm text-zinc-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

