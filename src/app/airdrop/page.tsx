import type { Metadata } from "next";
import { auth } from "@/auth";
import { AirdropPanel } from "@/components/airdrop-panel";

export const metadata: Metadata = {
  title: "Airdrop - FarmLabs",
  description: "Earn and claim FarmLabs tokens from the developer wallet.",
};

export default async function AirdropPage() {
  const session = await auth();

  return (
    <div className="app-main-container py-8 sm:py-10">
      <section className="mb-6 sm:mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Airdrop</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Earn FarmLabs Tokens</h1>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
          Start the airdrop, see how much you earned, then claim FL tokens sent from the FarmLabs developer wallet.
        </p>
      </section>

      <AirdropPanel
        isAuthenticated={!!session?.user}
        savedWallet={session?.user?.wallet ?? null}
      />
    </div>
  );
}
