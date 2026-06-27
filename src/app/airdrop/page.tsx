import { AirdropWaitlistPanel } from "@/components/airdrop-waitlist-panel";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Airdrop - FarmLabs",
  description: "Join the FarmLabs airdrop waitlist — coming soon.",
};

export default async function AirdropPage() {
  const session = await auth();

  let hasXAccount = false;
  if (session?.user?.id) {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "twitter" },
      select: { id: true },
    });
    hasXAccount = Boolean(account);
  }

  return (
    <div className="app-main-container py-8 sm:py-10">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section className="rounded-xl border border-white/10 bg-zinc-950/70 p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Airdrop</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Coming Soon</h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
            We are preparing the FarmLabs token airdrop. Join the waitlist with your X account and Solana wallet to
            get early access when claims open.
          </p>
        </section>

        <AirdropWaitlistPanel
          isAuthenticated={Boolean(session?.user)}
          hasXAccount={hasXAccount}
          savedWallet={session?.user?.wallet ?? null}
          userId={session?.user?.id ?? null}
        />
      </div>
    </div>
  );
}
