import { auth } from "@/auth";
import { ProjectCard } from "@/components/project-card";
import { prisma } from "@/lib/prisma";
import {
  applyVipMaskToProject,
  fetchEscrowUnlockedProjectIds,
  resolveVipViewForProject,
} from "@/lib/viewer-listing-access";
import { TrustedByMarquee } from "@/components/trusted-by-marquee";
import { HomeStatsStrip } from "@/components/home-stats-strip";
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
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
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
      <section className="w-full bg-gradient-to-b from-zinc-950 via-zinc-900 to-black pb-3 pt-2 sm:pt-3">
        <div className="app-main-container">
          <div className="relative pb-5 pt-8 text-center sm:pb-6 sm:pt-10">
            <div className="pointer-events-none absolute inset-x-0 -top-14 h-64 bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_70%)]" />
            <p className="inline-flex items-center gap-1 text-sm font-medium tracking-[0.08em] text-zinc-500">
              <span>Powered by</span>
              <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 398 311" className="-translate-y-px h-3.5 w-3.5 text-zinc-400" fill="currentColor" aria-hidden>
                  <path d="M64.6 237.2c2.3-2.3 5.3-3.6 8.6-3.6h311.9c5.4 0 8.1 6.5 4.3 10.3l-61.6 61.6c-2.3 2.3-5.3 3.6-8.6 3.6H7.3c-5.4 0-8.1-6.5-4.3-10.3zM64.6 5.6C67 3.2 70 1.9 73.2 1.9h311.9c5.4 0 8.1 6.5 4.3 10.3l-61.6 61.6c-2.3 2.3-5.3 3.6-8.6 3.6H7.3c-5.4 0-8.1-6.5-4.3-10.3zM327.8 120.5c-2.3-2.3-5.3-3.6-8.6-3.6H7.3c-5.4 0-8.1 6.5-4.3 10.3l61.6 61.6c2.3 2.3 5.3 3.6 8.6 3.6h311.9c5.4 0 8.1-6.5 4.3-10.3z" />
                </svg>
                <span>Solana</span>
              </span>
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              Built for degens. Public calls to VIP alpha.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
              FarmLabs is a community platform where you can grow your audience and monetize access through public and
              private/VIP listings.
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
              <Link
                href="/docs"
                className="rounded-md border border-white/15 px-5 py-2 text-center text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Docs
              </Link>
            </div>
          </div>

          <TrustedByMarquee />

          <HomeStatsStrip />
        </div>
      </section>

      <section className="app-main-container pb-12 pt-7 sm:pb-14 sm:pt-8">
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white sm:text-base">Top 10 Community</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Ranked by visitor views on FarmLabs (ties → newest first).
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

      <section className="app-main-container pb-12">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.45fr] lg:items-center">
            <div className="px-1 py-1.5 sm:px-2">
              <div className="flex h-full min-h-[300px] flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-xs">
                    Platform walkthrough
                  </p>
                  <h2 className="mt-1 text-base font-semibold tracking-tight text-white sm:text-lg">
                    See how listing and checkout work
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                    This walkthrough explains the full FarmLabs lifecycle from both operator and buyer perspectives. You
                    will see how to structure a listing, define access tiers, publish in directory, and guide buyers
                    from discovery to successful checkout.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                    It also covers post-purchase flow, including where buyers receive access links, how records appear
                    in dashboard, and how operators can manage listings, performance, and repeat purchases with a cleaner
                    operational setup.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-zinc-300 sm:text-sm">
                    <li>- Listing setup, positioning, and pricing basics</li>
                    <li>- Buyer checkout journey with SOL wallet</li>
                    <li>- Access delivery and post-purchase experience</li>
                    <li>- Dashboard tracking for sales and operations</li>
                  </ul>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/docs"
                  className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
                >
                  Open docs
                </Link>
                <Link
                  href="/dashboard/new"
                  className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-zinc-200"
                >
                  Create listing
                </Link>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40 p-1 sm:p-1.5">
              <div className="w-full overflow-hidden rounded-lg border border-white/10">
                <video
                  className="block h-auto w-full"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                >
                  <source
                    src="https://res.cloudinary.com/dyepsqsc6/video/upload/video_fix_h8yuun.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="app-main-container pb-12">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white sm:text-base">Problem solving for communities</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                Built to help operators monetize faster while buyers get cleaner access flow.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Problem</p>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                <li>Manual payment and DM verification take too much time.</li>
                <li>Operators struggle to organize free vs VIP access.</li>
                <li>Buyers are confused about where to join after purchase.</li>
              </ul>
            </article>

            <article className="rounded-xl border border-emerald-400/20 bg-emerald-950/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">Solution</p>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-200 sm:text-sm">
                <li>Create listings with clear type, access, and pricing tiers.</li>
                <li>Use wallet checkout flow for cleaner purchase experience.</li>
                <li>Manage listings, buyers, and purchases from one dashboard.</li>
              </ul>
            </article>

            <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Result</p>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                <li>Operators can monetize communities with less manual work.</li>
                <li>Buyers get faster, clearer onboarding after payment.</li>
                <li>Community operations become more consistent and scalable.</li>
              </ul>
            </article>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dashboard/new"
              className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-zinc-200"
            >
              Create listing
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              Read docs
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <article className="home-feature-card rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <div className="home-feature-icon-wrap">
                <svg viewBox="0 0 24 24" className="home-feature-icon home-feature-icon-orbit h-4 w-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 3v18M3 12h18" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-100 sm:text-sm">Fast Listing Setup</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">Publish public or VIP listing in minutes.</p>
            </article>

            <article className="home-feature-card rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <div className="home-feature-icon-wrap">
                <svg viewBox="0 0 24 24" className="home-feature-icon home-feature-icon-pulse h-4 w-4 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M3 12h4l2-4 3 8 2-4h7" />
                </svg>
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-100 sm:text-sm">Live Buyer Activity</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">Track purchase flow and member demand.</p>
            </article>

            <article className="home-feature-card rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <div className="home-feature-icon-wrap">
                <svg viewBox="0 0 24 24" className="home-feature-icon home-feature-icon-float h-4 w-4 text-violet-300" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 3l7 4v5c0 5-3.2 7.8-7 9-3.8-1.2-7-4-7-9V7l7-4z" />
                  <path d="M9.2 12.1l1.9 1.9 3.8-3.8" />
                </svg>
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-100 sm:text-sm">Secure Checkout Flow</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">Cleaner payment journey for operators and buyers.</p>
            </article>

            <article className="home-feature-card rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <div className="home-feature-icon-wrap">
                <svg viewBox="0 0 24 24" className="home-feature-icon home-feature-icon-glow h-4 w-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M8 11h8M8 15h5" />
                </svg>
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-100 sm:text-sm">Unified Dashboard</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">Manage listings, buyers, and performance in one place.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="app-main-container pb-14">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white sm:text-base">How FarmLabs works</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                Simple flow for operators and buyers from listing to access.
              </p>
            </div>
            <Link href="/docs" className="text-xs text-zinc-500 transition hover:text-zinc-300">
              Full guide
            </Link>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <div className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-1.5 text-[10px] font-semibold text-emerald-200">
                1
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-100 sm:text-sm">Create your listing</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Set title, pitch, type, access, and price tiers. Add Telegram or Discord links.
              </p>
            </article>

            <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <div className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-1.5 text-[10px] font-semibold text-cyan-200">
                2
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-100 sm:text-sm">Buyers join with wallet</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Buyers discover your listing, select a tier, and complete checkout directly from the detail page.
              </p>
            </article>

            <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
              <div className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-violet-300/30 bg-violet-400/10 px-1.5 text-[10px] font-semibold text-violet-200">
                3
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-100 sm:text-sm">Manage and scale</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Track purchases, reviews, and listing performance from dashboard to grow recurring revenue.
              </p>
            </article>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dashboard/new"
              className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-zinc-200"
            >
              Start listing now
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              Explore communities
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}




