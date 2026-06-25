import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Airdrop - FarmLabs",
  description: "Earn and claim FarmLabs tokens — coming soon.",
};

export default function AirdropPage() {
  return (
    <div className="app-main-container py-8 sm:py-10">
      <section className="rounded-xl border border-white/10 bg-zinc-950/70 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Airdrop</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Coming Soon</h1>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
          We are preparing the FarmLabs token airdrop. Connect your wallet and claim FL rewards — stay tuned.
        </p>
      </section>
    </div>
  );
}
