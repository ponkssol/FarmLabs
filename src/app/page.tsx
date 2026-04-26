import { auth } from "@/auth";
import { ProjectCard } from "@/components/project-card";
import { prisma } from "@/lib/prisma";
import {
  applyVipMaskToProject,
  fetchEscrowUnlockedProjectIds,
  resolveVipViewForProject,
} from "@/lib/viewer-listing-access";
import { TrustedByMarquee } from "@/components/trusted-by-marquee";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FarmLabs - Degen calls marketplace",
  description:
    "List your public calls and paid private calls across Telegram, Discord, and X Community with escrow checkout.",
};

export default async function Home() {
  const rawItems = await prisma.project.findMany({
    where: { published: true },
    take: 10,
    orderBy: [{ escrowOrders: { _count: "desc" } }, { createdAt: "desc" }],
    include: {
      user: {
        select: {
          name: true,
          image: true,
          wallet: true,
          xHandle: true,
          accounts: {
            where: { provider: "twitter" },
            take: 1,
            select: { providerAccountId: true },
          },
        },
      },
      priceOptions: {
        orderBy: { sortOrder: "asc" },
        select: { priceAmount: true, id: true, label: true, telegramUrl: true, discordUrl: true },
      },
    },
  });
  const session = await auth();
  const viewerId = session?.user?.id;
  const unlocked = await fetchEscrowUnlockedProjectIds(
    viewerId,
    rawItems.map((p) => p.id),
  );
  const items = rawItems.map((p) => {
    const state = resolveVipViewForProject(p, viewerId, unlocked, p.priceOptions);
    return applyVipMaskToProject(p, {
      redactVipText: state.redactVipText,
      maskVipLinks: state.maskVipLinks,
    });
  }) as (typeof rawItems)[number][];

  return (
    <div>
      <section className="w-full border-b border-white/10 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black pb-3 pt-2 sm:pt-3">
        <div className="app-container">
          <div className="relative pb-5 pt-8 text-center sm:pb-6 sm:pt-10">
            <div className="pointer-events-none absolute inset-x-0 -top-14 h-64 bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_70%)]" />
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">Degen calls marketplace</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Built for degens. Public calls to VIP alpha.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
              Publish your degen calls on Telegram, Discord, or X Community. Keep public calls open,
              and monetize private/VIP alpha with escrow checkout.
            </p>

            <div className="mt-12 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Link
                href="/login"
                className="rounded-md bg-white px-5 py-2 text-center text-xs font-medium text-black transition hover:bg-zinc-200"
              >
                Start cooking
              </Link>
              <Link
                href="/explore"
                className="rounded-md border border-white/15 px-5 py-2 text-center text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Explore calls
              </Link>
            </div>
          </div>

          <TrustedByMarquee />

          <div className="grid grid-cols-2 divide-x divide-y divide-white/10 bg-black/40 text-center sm:grid-cols-4 sm:divide-y-0">
            <div className="px-3 py-4">
              <p className="text-lg font-semibold text-white">$950k+</p>
              <p className="text-sm text-zinc-500">Escrowed volume</p>
            </div>
            <div className="px-3 py-4">
              <p className="text-lg font-semibold text-white">1,200+</p>
              <p className="text-sm text-zinc-500">Public + private calls</p>
            </div>
            <div className="px-3 py-4">
              <p className="text-lg font-semibold text-white">&lt;300ms</p>
              <p className="text-sm text-zinc-500">API response</p>
            </div>
            <div className="px-3 py-4">
              <p className="text-lg font-semibold text-white">24/7</p>
              <p className="text-sm text-zinc-500">Degen activity</p>
            </div>
          </div>
        </div>
      </section>

      <section className="app-container pb-12 pt-7 sm:pb-14 sm:pt-8">
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white sm:text-base">Top 10 Community</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Ranked by escrow activity on FarmLabs (ties → newest first).
            </p>
          </div>
          <Link href="/explore" className="shrink-0 text-xs text-zinc-500 transition hover:text-zinc-300">
            View all
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">
            No communities listed yet.
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {items.map((p) => (
              <li key={p.id} className="h-full">
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}




