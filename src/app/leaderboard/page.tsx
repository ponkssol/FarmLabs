import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leader Board - FarmLabs",
  description: "Community ranking and performance board is coming soon.",
};

export default function LeaderBoardPage() {
  return (
    <div className="app-main-container py-8 sm:py-10">
      <section className="rounded-xl border border-white/10 bg-zinc-950/70 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Leader Board</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Coming Soon</h1>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
          We are preparing ranking metrics for top operators and communities. Stay tuned.
        </p>
      </section>
    </div>
  );
}
