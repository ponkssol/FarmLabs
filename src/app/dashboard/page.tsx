import { SyncXHandleButton } from "@/components/sync-x-handle-button";
import { EscrowReviewForm } from "@/components/dashboard/escrow-review-form";
import { WalletLinkPanel } from "@/components/solana/wallet-link-panel";
import { auth } from "@/auth";
import { formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import { Flag, LayoutGrid, ShoppingBag, Star, Users, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard - FarmLabs",
};

type ListingFilter = "ALL" | "PUBLIC" | "PRIVATE" | "PAID";
const statusItems: Array<{ key: ListingFilter; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "PUBLIC", label: "Public" },
  { key: "PRIVATE", label: "Private" },
  { key: "PAID", label: "Paid" },
];

const reportReasonLabel: Record<string, string> = {
  SPAM: "Spam",
  SCAM: "Scam",
  MISLEADING: "Misleading",
  IP: "Copyright / IP",
  OTHER: "Other",
};

const activityTabKeys = ["listings", "purchases", "sales", "reviews", "reports"] as const;
type ActivityTab = (typeof activityTabKeys)[number];

const listingsNav: { key: "listings"; label: string; line: string } = {
  key: "listings",
  label: "Your community listings",
  line: "Filter, edit, or open your public / paid calls",
};

const escrowActivityTabs: { key: Exclude<ActivityTab, "listings">; label: string; line: string }[] = [
  { key: "purchases", label: "Purchase history", line: "Your escrow buys" },
  { key: "sales", label: "Sales & buyers", line: "Who bought your VIP calls" },
  { key: "reviews", label: "Buyer reviews", line: "Feedback to you" },
  { key: "reports", label: "Reports", line: "On your listings" },
];

const escrowMenuIcon: Record<Exclude<ActivityTab, "listings">, LucideIcon> = {
  purchases: ShoppingBag,
  sales: Users,
  reviews: Star,
  reports: Flag,
};

const menuIconClass = "h-3.5 w-3.5 shrink-0";
const menuIconStroke = 1.65;

function buildDashboardUrl(status: ListingFilter, activity: ActivityTab) {
  const p = new URLSearchParams();
  if (status !== "ALL") p.set("status", status);
  if (activity !== "listings") p.set("activity", activity);
  const q = p.toString();
  return q ? `/dashboard?${q}` : "/dashboard";
}

function parseActivity(s: string | undefined): ActivityTab {
  if (s && (activityTabKeys as readonly string[]).includes(s)) {
    return s as ActivityTab;
  }
  return "listings";
}

type Props = {
  searchParams: Promise<{ status?: ListingFilter; activity?: string }>;
};

function SectionCard({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-xl border border-white/10 bg-zinc-950/75 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
    >
      <div className="border-b border-white/10 px-3 py-2 sm:px-3.5 sm:py-2">
        <h2 className="text-xs font-semibold text-white sm:text-[13px]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">{subtitle}</p>}
      </div>
      <div className="p-2.5 sm:p-3">{children}</div>
    </section>
  );
}

/** Flat header + content — no card box (used for purchase → reports panels). */
function ActivityBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-0.5">
      <h2 className="text-xs font-semibold text-white sm:text-[13px]">{title}</h2>
      {subtitle ? <p className="mt-0.5 max-w-2xl text-[9px] leading-snug text-zinc-500 sm:text-[10px]">{subtitle}</p> : null}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const { status = "ALL", activity: activityParam } = await searchParams;
  const activity = parseActivity(activityParam);
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const userId = session.user.id;
  const hasWallet = !!session.user.wallet;

  const [me, projects, buyerOrders, sellerOrders, incomingReports, reviewAgg, projectCounts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { xHandle: true } }),
    prisma.project.findMany({
      where: {
        userId,
        ...(status === "PUBLIC"
          ? { groupType: "PUBLIC" }
          : status === "PRIVATE"
            ? { groupType: "PRIVATE" }
            : status === "PAID"
              ? { accessType: "PAID" }
              : {}),
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.escrowOrder.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        project: { select: { id: true, title: true, slug: true, communityImage: true } },
        review: true,
        seller: { select: { name: true, image: true } },
      },
    }),
    prisma.escrowOrder.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        project: { select: { id: true, title: true, slug: true, communityImage: true } },
        review: true,
        buyer: { select: { name: true, image: true, id: true } },
      },
    }),
    prisma.projectReport.findMany({
      where: { project: { userId } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        project: { select: { title: true, slug: true, id: true } },
        reporter: { select: { name: true, image: true, id: true } },
      },
    }),
    prisma.escrowReview.aggregate({
      where: { order: { sellerId: userId } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.$transaction([
      prisma.project.count({ where: { userId } }),
      prisma.project.count({ where: { userId, groupType: "PUBLIC" } }),
      prisma.project.count({ where: { userId, groupType: "PRIVATE" } }),
      prisma.project.count({ where: { userId, accessType: "PAID" } }),
    ]),
  ]);

  const [totalProjects, publicCount, privateCount, paidCount] = projectCounts;
  const avgIncoming = reviewAgg._avg.rating ?? 0;
  const reviewAsSellerCount = reviewAgg._count._all;
  const openReportCount = incomingReports.filter((r) => r.status === "OPEN").length;

  return (
    <div className="app-container py-4 sm:py-5">
      <div className="mb-3.5 flex flex-col gap-0.5 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">Dashboard</h1>
          <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
            Manage listings, escrow, buyer reviews, and reports on your calls.
          </p>
        </div>
        {hasWallet ? (
          <Link
            href="/dashboard/new"
            className="mt-2 inline-flex w-fit items-center justify-center rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-medium text-zinc-950 transition hover:bg-zinc-200 sm:mt-0"
          >
            + New listing
          </Link>
        ) : (
          <p className="text-[9px] text-amber-200/80 sm:text-[10px]">Connect a wallet to create a listing.</p>
        )}
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-zinc-950/60 p-2.5 sm:p-3">
          <p className="text-[8px] font-medium uppercase tracking-wider text-emerald-200/70">Listings</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">{totalProjects}</p>
          <p className="mt-0.5 text-[8px] leading-tight text-zinc-500">
            Public {publicCount} · private {privateCount}
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-950/35 to-zinc-950/60 p-2.5 sm:p-3">
          <p className="text-[8px] font-medium uppercase tracking-wider text-sky-200/70">Escrow (buys)</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">{buyerOrders.length}</p>
          <p className="mt-0.5 text-[8px] text-zinc-500">As buyer</p>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/35 to-zinc-950/60 p-2.5 sm:p-3">
          <p className="text-[8px] font-medium uppercase tracking-wider text-violet-200/70">Reviews in</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">
            {reviewAsSellerCount > 0 ? avgIncoming.toFixed(1) : "—"}
            {reviewAsSellerCount > 0 && <span className="ml-0.5 text-xs font-normal text-zinc-500">/5</span>}
          </p>
          <p className="mt-0.5 text-[8px] text-zinc-500">{reviewAsSellerCount} from buyers</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/35 to-zinc-950/60 p-2.5 sm:p-3">
          <p className="text-[8px] font-medium uppercase tracking-wider text-amber-200/70">Reports</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">{incomingReports.length}</p>
          <p className="mt-0.5 text-[8px] leading-tight text-zinc-500">
            {incomingReports.length === 0
              ? "No reports yet"
              : `${openReportCount} open · ${incomingReports.length} total`}
          </p>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-12 lg:items-start">
        <div className="order-2 space-y-3.5 lg:col-span-8">
          {activity === "listings" && (
          <SectionCard
            id="listings"
            title="Your community listings"
            subtitle="Public and private / VIP calls. Filter, edit, or open the public page."
          >
            <div className="flex flex-wrap gap-1.5">
              {statusItems.map((item) => {
                const active = status === item.key;
                return (
                  <Link
                    key={item.key}
                    href={buildDashboardUrl(item.key, activity)}
                    className={`rounded-md px-2 py-1 text-[9px] font-medium transition ${
                      active
                        ? "bg-white text-zinc-950"
                        : "border border-white/10 bg-zinc-900/50 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            {projects.length === 0 ? (
              <div className="mt-2.5 rounded-lg border border-dashed border-white/10 bg-zinc-900/30 p-4 text-center sm:p-5">
                <p className="text-xs text-zinc-400">No listings yet.</p>
                <p className="mt-1 text-[9px] text-zinc-600 sm:text-[10px]">Connect your wallet, then create a listing with the button above.</p>
              </div>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {projects.map((p) => (
                  <li
                    key={p.id}
                    className="group flex flex-col gap-2 rounded-lg border border-white/10 bg-zinc-900/40 p-2.5 transition hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      {p.communityImage ? (
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10">
                          <Image
                            src={p.communityImage}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-[11px] font-semibold text-zinc-500">
                          {(p.title || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white sm:text-sm">{p.title}</p>
                        <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">
                          {p.published ? "Published" : "Draft"} · {p.groupType} · {p.accessType}
                          {p.category ? ` · ${p.category}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {p.published && (
                        <Link
                          href={`/p/${p.slug}`}
                          className="rounded border border-white/12 px-2 py-0.5 text-[9px] text-zinc-300 hover:bg-white/5"
                        >
                          View
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/edit/${p.id}`}
                        className="rounded border border-white/20 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-zinc-100 hover:bg-white/10"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          )}

          {activity === "purchases" && (
            <ActivityBlock
              title="Purchase history"
              subtitle="Escrow payments (paid private) — you can leave a review after each buy."
            >
              {buyerOrders.length === 0 ? (
                <p className="text-[10px] leading-relaxed text-zinc-500 sm:text-[11px]">
                  No purchases yet. Find paid private listings in Explore.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.08]">
                  {buyerOrders.map((o) => (
                    <li key={o.id} className="py-2.5 first:pt-0 last:pb-0 sm:py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-zinc-100 sm:text-sm">{o.project.title}</p>
                          <p className="text-[9px] text-zinc-500 sm:text-[10px]">
                            {formatEscrowAmountLabel(o.amount, resolvePriceCurrency(o.currency))} · {o.status} ·{" "}
                            {new Date(o.createdAt).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <p className="mt-0.5 text-[9px] text-zinc-600">
                            Operator: {o.seller.name || "—"}
                          </p>
                        </div>
                        <Link
                          href={`/p/${o.project.slug}`}
                          className="shrink-0 text-[9px] text-sky-400/90 hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                      <div className="mt-2 border-t border-dotted border-white/10 pt-2">
                        <EscrowReviewForm
                          orderId={o.id}
                          review={o.review ? { ...o.review, createdAt: o.review.createdAt } : null}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ActivityBlock>
          )}

          {activity === "sales" && (
            <ActivityBlock
              title="Sales & buyers"
              subtitle="Who bought your paid private listings through escrow."
            >
              {sellerOrders.length === 0 ? (
                <p className="text-[10px] leading-relaxed text-zinc-500 sm:text-[11px]">
                  No sales yet. Publish a private, paid listing with a price to enable escrow.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.08]">
                  {sellerOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:py-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {o.buyer.image ? (
                          <Image
                            src={o.buyer.image}
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full border border-white/10 object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full border border-white/10 bg-zinc-800" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs text-zinc-200">{o.buyer.name || "Buyer"}</p>
                          <p className="text-[9px] text-zinc-500 sm:text-[10px]">
                            {o.project.title} · {formatEscrowAmountLabel(o.amount, resolvePriceCurrency(o.currency))}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[9px] text-zinc-500 sm:text-[10px]">
                          {new Date(o.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        {o.review ? (
                          <p className="mt-0.5 text-[9px] text-amber-200/90 sm:text-[10px]">
                            Review: {o.review.rating}/5
                            {o.review.comment?.trim()
                              ? ` — “${o.review.comment.slice(0, 80)}${o.review.comment.length > 80 ? "…" : ""}”`
                              : ""}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[9px] text-zinc-600">No review yet</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ActivityBlock>
          )}

          {activity === "reviews" && (
            <ActivityBlock
              title="Buyer reviews"
              subtitle="All feedback from transactions where you are the operator."
            >
              {reviewAsSellerCount === 0 ? (
                <p className="text-[10px] leading-relaxed text-zinc-500 sm:text-[11px]">
                  Reviews show up when buyers rate their purchase in Purchase history.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.08]">
                  {sellerOrders
                    .filter((o) => o.review)
                    .map((o) => (
                      <li
                        key={o.id}
                        className="py-2.5 first:pt-0 last:pb-0 sm:py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-zinc-200">{o.buyer.name || "Buyer"}</p>
                          <span className="text-[10px] text-amber-400 sm:text-xs">
                            {o.review && "★".repeat(o.review.rating)}
                            {o.review && <span className="text-zinc-600">{"☆".repeat(5 - o.review.rating)}</span>}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[9px] text-zinc-500">{o.project.title}</p>
                        {o.review?.comment ? (
                          <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-300">{o.review.comment}</p>
                        ) : null}
                        <p className="mt-1 text-[8px] text-zinc-600 sm:text-[9px]">
                          {o.review &&
                            new Date(o.review.createdAt).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </ActivityBlock>
          )}

          {activity === "reports" && (
            <ActivityBlock
              title="Reports on your listings"
              subtitle="From visitors — review and update your listing as needed."
            >
              {incomingReports.length === 0 ? (
                <p className="text-[10px] text-zinc-500 sm:text-[11px]">No reports. You&apos;re all clear for now.</p>
              ) : (
                <ul className="divide-y divide-rose-500/10">
                  {incomingReports.map((r) => (
                    <li
                      key={r.id}
                      className="py-2.5 first:pt-0 last:pb-0 sm:py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <p className="text-xs font-medium text-rose-100/90">
                          {reportReasonLabel[r.reason] ?? r.reason}
                        </p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[8px] font-medium sm:text-[9px] ${
                            r.status === "OPEN" ? "bg-amber-500/20 text-amber-200" : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">Listing: {r.project.title}</p>
                      <p className="text-[9px] text-zinc-500 sm:text-[10px]">
                        Reporter: {r.reporter.name || "User"}{" "}
                        {new Date(r.createdAt).toLocaleString("en-US", { dateStyle: "short" })}
                      </p>
                      {r.message ? (
                        <p className="mt-1.5 pl-0 text-[10px] leading-relaxed text-zinc-400 sm:text-[11px]">
                          {r.message}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </ActivityBlock>
          )}
        </div>

        <aside className="order-1 space-y-2.5 lg:col-span-4 lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-3 sm:px-3.5 sm:py-3">
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  width={44}
                  height={44}
                  className="rounded-xl border border-white/10"
                  alt=""
                />
              ) : (
                <div className="h-11 w-11 rounded-xl border border-white/10 bg-zinc-800" />
              )}
              <div>
                <p className="text-xs font-semibold text-white sm:text-sm">{session.user.name || "Creator"}</p>
                <p className="text-[9px] text-zinc-500 sm:text-[10px]">Operator</p>
              </div>
            </div>
            <WalletLinkPanel inProfile />

            <div className="mt-2.5 space-y-1 rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-[9px] text-zinc-400 sm:text-[10px]">
              <p>
                Listing: <span className="text-zinc-200">{totalProjects}</span> (paid {paidCount})
              </p>
            </div>
            {!me?.xHandle ? <div className="mt-2"><SyncXHandleButton /></div> : null}
          </div>

          <div className="mt-0.5 space-y-3.5 border-t border-white/5 pt-2.5">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-[9px] sm:tracking-[0.16em]">
                Listings
              </p>
              <nav className="mt-1.5" aria-label="Listings">
                <Link
                  href={buildDashboardUrl(status, "listings")}
                  title={listingsNav.line}
                  className={`flex items-center gap-2 border-l-2 py-1.5 pl-2.5 pr-0 text-left text-[10px] font-medium leading-snug transition sm:py-2 sm:text-[11px] ${
                    activity === "listings"
                      ? "border-white text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <LayoutGrid
                    className={menuIconClass}
                    strokeWidth={menuIconStroke}
                    aria-hidden
                  />
                  <span className="min-w-0">{listingsNav.label}</span>
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-[9px] sm:tracking-[0.16em]">
                Activity
              </p>
              <nav className="mt-1.5" aria-label="Escrow and reports">
                <ul className="divide-y divide-white/[0.07]">
                  {escrowActivityTabs.map((t) => {
                    const active = activity === t.key;
                    const Icon = escrowMenuIcon[t.key];
                    return (
                      <li key={t.key}>
                        <Link
                          href={buildDashboardUrl(status, t.key)}
                          title={t.line}
                          className={`flex items-center gap-2 border-l-2 py-1.5 pl-2.5 pr-0 text-left text-[10px] font-medium leading-snug transition sm:py-2 sm:text-[11px] ${
                            active
                              ? "border-white text-white"
                              : "border-transparent text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <Icon
                            className={menuIconClass}
                            strokeWidth={menuIconStroke}
                            aria-hidden
                          />
                          <span className="min-w-0">{t.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
