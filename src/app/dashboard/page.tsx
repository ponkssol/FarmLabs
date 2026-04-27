import { SyncXHandleButton } from "@/components/sync-x-handle-button";
import { EscrowReviewForm } from "@/components/dashboard/escrow-review-form";
import { SellerReviewReply } from "@/components/dashboard/seller-review-reply";
import { ConnectWalletCta } from "@/components/dashboard/connect-wallet-cta";
import { WalletLinkPanel } from "@/components/solana/wallet-link-panel";
import { auth } from "@/auth";
import { formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import { BarChart2, Flag, LayoutGrid, ShoppingBag, Star, Users, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Fragment, type ReactNode } from "react";

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

const activityTabKeys = ["listings", "purchases", "sales", "analytics", "reviews", "reports"] as const;
type ActivityTab = (typeof activityTabKeys)[number];

const listingsNav: { key: "listings"; label: string; line: string } = {
  key: "listings",
  label: "Your community listings",
  line: "Filter, edit, or open your public / paid calls",
};

const escrowActivityTabs: { key: Exclude<ActivityTab, "listings">; label: string; line: string }[] = [
  { key: "purchases", label: "Purchase history", line: "Your escrow buys" },
  { key: "sales", label: "Sales & buyers", line: "Who bought your VIP calls" },
  { key: "analytics", label: "Analytics", line: "Views, sales, per-listing report" },
  { key: "reviews", label: "Buyer reviews", line: "Feedback to you" },
  { key: "reports", label: "Visitor flags", line: "Spam / abuse reports — not your sales" },
];

const escrowMenuIcon: Record<Exclude<ActivityTab, "listings">, LucideIcon> = {
  purchases: ShoppingBag,
  sales: Users,
  analytics: BarChart2,
  reviews: Star,
  reports: Flag,
};

const menuIconClass = "h-3.5 w-3.5 shrink-0";
const menuIconStroke = 1.65;

const UNLOCKED_ESCROW_STATUSES = new Set(["SETTLED", "RELEASED", "FUNDED"]);

function purchaseAccessState(o: { status: string; accessExpiresAt: Date | null }): "active" | "expired" | "pending" {
  if (!UNLOCKED_ESCROW_STATUSES.has(o.status)) return "pending";
  if (o.accessExpiresAt && o.accessExpiresAt.getTime() <= Date.now()) return "expired";
  return "active";
}

function strInvite(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

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
  searchParams: Promise<{ status?: ListingFilter; activity?: string; connectWallet?: string }>;
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
        <h2 className="text-sm font-semibold text-white sm:text-base">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 sm:text-sm">{subtitle}</p>}
      </div>
      <div className="p-2.5 sm:p-3">{children}</div>
    </section>
  );
}

const tableTh =
  "whitespace-nowrap px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-zinc-500 first:pl-2 last:pr-2 sm:px-3 sm:text-xs sm:first:pl-3 sm:last:pr-3";
const tableTd =
  "border-b border-white/[0.06] px-2 py-2 align-top text-[11px] text-zinc-300 first:pl-2 last:pr-2 sm:px-3 sm:py-2.5 sm:text-xs sm:first:pl-3 sm:last:pr-3";
const tableTdSub =
  "border-b border-white/[0.06] bg-zinc-950/30 px-2 py-2 text-[11px] first:pl-2 last:pr-2 sm:px-3 sm:py-2.5 sm:text-xs sm:first:pl-3 sm:last:pr-3";

/**
 * Activity panels (purchases, sales, reviews, reports) — same card chrome as “Your community listings”
 * (`SectionCard`): bordered header row + padded body.
 */
function ActivityBlock({
  title,
  subtitle,
  children,
  dense,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Slightly smaller title line in the card header (table-heavy views) */
  dense?: boolean;
}) {
  return (
    <section className="scroll-mt-20 rounded-xl border border-white/10 bg-zinc-950/75 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="border-b border-white/10 px-3 py-2 sm:px-3.5 sm:py-2.5">
        <h2
          className={
            dense
              ? "text-sm font-semibold tracking-tight text-white"
              : "text-sm font-semibold text-white sm:text-base"
          }
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className={
              dense
                ? "mt-0.5 max-w-2xl text-sm leading-relaxed text-zinc-500"
                : "mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 sm:text-sm"
            }
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="p-2.5 sm:p-3">{children}</div>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const { status = "ALL", activity: activityParam, connectWallet } = await searchParams;
  const activity = parseActivity(activityParam);
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const userId = session.user.id;
  const hasWallet = !!session.user.wallet;

  const [me, projects, buyerOrders, sellerOrders, incomingReports, reviewAgg, projectCounts] = await Promise.all([
    /** Raw: works when Prisma client is stale (e.g. after failed `prisma generate` on Windows). */
    prisma
      .$queryRawUnsafe<Array<{ xHandle: string | null }>>(
        `SELECT "xHandle" FROM "User" WHERE "id" = ?`,
        userId,
      )
      .then((rows) => rows[0] ?? null),
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
        seller: { select: { name: true, image: true, xHandle: true } },
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
  const now = new Date();
  const activeMemberships = buyerOrders.filter(
    (o) => UNLOCKED_ESCROW_STATUSES.has(o.status) && (o.accessExpiresAt == null || o.accessExpiresAt > now),
  ).length;
  const completedSalesAsSeller = sellerOrders.filter((o) => UNLOCKED_ESCROW_STATUSES.has(o.status)).length;

  const sellerAnalytics = await (async () => {
    const doneStatuses = ["SETTLED", "RELEASED", "FUNDED"] as const;
    const doneWhere = { sellerId: userId, status: { in: [...doneStatuses] } };
    const [solNet, usdcNet, completedCount, byStatus, byProjectCur] = await Promise.all([
      prisma.escrowOrder.aggregate({
        where: { ...doneWhere, currency: "SOL" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.escrowOrder.aggregate({
        where: { ...doneWhere, currency: "USDC" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.escrowOrder.count({ where: doneWhere }),
      prisma.escrowOrder.groupBy({
        by: ["status"],
        where: { sellerId: userId },
        _count: { _all: true },
      }),
      prisma.escrowOrder.groupBy({
        by: ["projectId", "currency"],
        where: doneWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    const projectIds = [...new Set(byProjectCur.map((r) => r.projectId))];
    const projectRows =
      projectIds.length > 0
        ? await prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, title: true, slug: true },
          })
        : [];
    const projectById = new Map(projectRows.map((p) => [p.id, p]));
    type PerProject = { sol: number; usdc: number; orders: number };
    const byProject = new Map<string, PerProject>();
    for (const r of byProjectCur) {
      const cur = byProject.get(r.projectId) ?? { sol: 0, usdc: 0, orders: 0 };
      cur.orders += r._count._all;
      const amt = r._sum.amount ?? 0;
      if (r.currency === "SOL") cur.sol += amt;
      if (r.currency === "USDC") cur.usdc += amt;
      byProject.set(r.projectId, cur);
    }
    const byProjectSorted = [...byProject.entries()]
      .map(([projectId, v]) => ({
        projectId,
        project: projectById.get(projectId),
        ...v,
      }))
      .sort((a, b) => b.orders - a.orders);

    const allProjects = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        slug: string;
        viewCount: number;
        published: number | boolean;
      }>
    >(
      `SELECT "id", "title", "slug", "viewCount", "published" FROM "Project" WHERE "userId" = ? ORDER BY "viewCount" DESC`,
      userId,
    );
    const totalPageViews = allProjects.reduce((acc, pr) => acc + (pr.viewCount ?? 0), 0);
    const listingReport = allProjects.map((proj) => {
      const s = byProject.get(proj.id) ?? { sol: 0, usdc: 0, orders: 0 };
      return {
        projectId: proj.id,
        title: proj.title,
        slug: proj.slug,
        published: Boolean(proj.published),
        views: proj.viewCount ?? 0,
        completedSales: s.orders,
        sol: s.sol,
        usdc: s.usdc,
      };
    });
    const topByViews = [...listingReport].sort((a, b) => b.views - a.views).slice(0, 8);
    const topBySales = [...listingReport]
      .sort((a, b) => {
        if (b.completedSales !== a.completedSales) return b.completedSales - a.completedSales;
        const vol = (x: (typeof listingReport)[0]) => x.sol + x.usdc;
        return vol(b) - vol(a);
      })
      .slice(0, 8);

    return {
      solTotal: solNet._sum.amount ?? 0,
      usdcTotal: usdcNet._sum.amount ?? 0,
      solOrders: solNet._count._all,
      usdcOrders: usdcNet._count._all,
      completedCount,
      byStatus: byStatus.sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0)),
      byProjectSorted,
      totalPageViews,
      listingReport,
      topByViews,
      topBySales,
    };
  })();

  return (
    <div className="app-main-container py-4 sm:py-5">
      <div className="mb-3.5 flex flex-col gap-0.5 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Dashboard</h1>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            Listings, escrow, table views, seller analytics, and visitor flags.
          </p>
          {connectWallet === "1" ? (
            <p className="mt-1 text-xs text-amber-200/85 sm:text-sm">
              Connect and save your wallet first to create a new listing.
            </p>
          ) : null}
        </div>
        {hasWallet ? (
          <Link
            href="/dashboard/new"
            className="mt-2 inline-flex w-fit min-h-9 items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 sm:mt-0"
          >
            + New listing
          </Link>
        ) : (
          <ConnectWalletCta />
        )}
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-2.5 sm:p-3">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">
            Listings
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100 sm:text-base">{totalProjects}</p>
          <p className="mt-0.5 text-[9px] leading-tight text-zinc-500 sm:text-[10px]">
            Public {publicCount} · private {privateCount}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-2.5 sm:p-3">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">
            Escrow (buys)
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100 sm:text-base">{buyerOrders.length}</p>
          <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">As buyer</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-2.5 sm:p-3">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">
            Active access
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100 sm:text-base">{activeMemberships}</p>
          <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">Communities · not expired</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-2.5 sm:p-3">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">
            Reviews in
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100 sm:text-base">
            {reviewAsSellerCount > 0 ? avgIncoming.toFixed(1) : "—"}
            {reviewAsSellerCount > 0 && <span className="ml-0.5 text-[10px] font-normal text-zinc-500">/5</span>}
          </p>
          <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">{reviewAsSellerCount} from buyers</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-2.5 sm:p-3">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">
            Flags
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100 sm:text-base">{incomingReports.length}</p>
          <p className="mt-0.5 text-[9px] leading-tight text-zinc-500 sm:text-[10px]">
            {incomingReports.length === 0
              ? "Visitor reports only"
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
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${
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
                <p className="mt-1 text-xs text-zinc-600 sm:text-sm">Connect your wallet, then create a listing with the button above.</p>
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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-sm font-semibold text-zinc-500">
                          {(p.title || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white sm:text-sm">{p.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                          {p.published ? "Published" : "Draft"} · {p.groupType} · {p.accessType}
                          {p.category ? ` · ${p.category}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {p.published && (
                        <Link
                          href={`/p/${p.slug}`}
                          className="rounded border border-white/12 px-2 py-0.5 text-xs text-zinc-300 hover:bg-white/5"
                        >
                          View
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/edit/${p.id}`}
                        className="rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
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
              dense
              title="Purchase history"
              subtitle="Table of orders. Invites and review live in the second row of each order."
            >
              {buyerOrders.length === 0 ? (
                <p className="text-xs leading-relaxed text-zinc-500">No purchases yet. Find paid private listings in Explore.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/8">
                  <table className="w-full min-w-[800px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-zinc-900/60">
                        <th className={tableTh}>Product</th>
                        <th className={tableTh}>Status</th>
                        <th className={tableTh}>Price</th>
                        <th className={tableTh}>Date</th>
                        <th className={tableTh}>Access</th>
                        <th className={tableTh}>Invites</th>
                        <th className={tableTh}>Host</th>
                        <th className={tableTh}> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyerOrders.map((o) => {
                        const acc = purchaseAccessState(o);
                        const tg = strInvite(o.grantedTelegramUrl);
                        const dc = strInvite(o.grantedDiscordUrl);
                        const showInvites = acc === "active" && (Boolean(tg) || Boolean(dc));
                        const accessLine = o.accessExpiresAt
                          ? acc === "expired"
                            ? `Ended ${new Date(o.accessExpiresAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}`
                            : `Until ${new Date(o.accessExpiresAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}`
                          : acc === "active" && UNLOCKED_ESCROW_STATUSES.has(o.status)
                            ? "No expiry"
                            : "—";
                        return (
                          <Fragment key={o.id}>
                            <tr>
                              <td className={tableTd}>
                                <p className="max-w-[220px] font-medium text-zinc-200">{o.project.title}</p>
                                {o.priceOptionLabel ? (
                                  <p className="mt-0.5 text-xs text-zinc-500">Tier: {o.priceOptionLabel}</p>
                                ) : null}
                              </td>
                              <td className={tableTd}>
                                {acc === "active" && (
                                  <span className="inline-block rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-emerald-200/90 sm:text-xs">
                                    Active
                                  </span>
                                )}
                                {acc === "expired" && (
                                  <span className="inline-block rounded border border-zinc-600/40 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-zinc-400 sm:text-xs">
                                    Expired
                                  </span>
                                )}
                                {acc === "pending" && (
                                  <span className="inline-block max-w-[100px] truncate text-xs text-amber-200/90" title={o.status}>
                                    {o.status}
                                  </span>
                                )}
                              </td>
                              <td className={`${tableTd} whitespace-nowrap text-zinc-300`}>
                                {formatEscrowAmountLabel(o.amount, resolvePriceCurrency(o.currency))}
                              </td>
                              <td className={`${tableTd} whitespace-nowrap text-zinc-500`}>
                                {new Date(o.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" })}
                              </td>
                              <td className={`${tableTd} max-w-[140px] text-xs text-zinc-400`} suppressHydrationWarning>
                                {accessLine}
                              </td>
                              <td className={tableTd}>
                                {showInvites ? (
                                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
                                    {tg ? (
                                      <a
                                        href={tg}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-sky-400/90 underline decoration-sky-500/30 hover:text-sky-300"
                                      >
                                        TG
                                      </a>
                                    ) : null}
                                    {dc ? (
                                      <a
                                        href={dc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-indigo-300/90 underline decoration-indigo-500/30 hover:text-indigo-200"
                                      >
                                        Discord
                                      </a>
                                    ) : null}
                                  </div>
                                ) : acc === "active" && !tg && !dc && UNLOCKED_ESCROW_STATUSES.has(o.status) ? (
                                  <p className="text-xs leading-snug text-amber-200/80">
                                    None stored ·{" "}
                                    <Link href={`/p/${o.project.slug}`} className="text-sky-400/90 underline">
                                      try listing
                                    </Link>
                                  </p>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                              <td className={`${tableTd} max-w-[100px] truncate text-zinc-500`} title={o.seller.name ?? ""}>
                                {o.seller.name || "—"}
                              </td>
                              <td className={`${tableTd} text-right`}>
                                <Link
                                  href={`/p/${o.project.slug}`}
                                  className="text-sm font-medium text-sky-400/90 hover:underline"
                                >
                                  Open
                                </Link>
                              </td>
                            </tr>
                            <tr>
                              <td className={tableTdSub} colSpan={8}>
                                <div className="max-w-3xl">
                                  <p className="mb-1.5 text-sm font-medium uppercase tracking-wider text-zinc-500">Review</p>
                                  <EscrowReviewForm
                                    compact
                                    orderId={o.id}
                                    review={o.review ? { ...o.review, createdAt: o.review.createdAt } : null}
                                    operatorName={o.seller.name}
                                  />
                                </div>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ActivityBlock>
          )}

          {activity === "sales" && (
            <ActivityBlock
              dense
              title="Sales & buyers"
              subtitle="Escrow sales. Reply to reviews in the Buyer reviews tab."
            >
              {sellerOrders.length === 0 ? (
                <p className="text-xs leading-relaxed text-zinc-500">
                  No sales yet. Publish a private, paid listing with a price to enable escrow.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/8">
                  <table className="w-full min-w-[700px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-zinc-900/60">
                        <th className={tableTh}>Buyer</th>
                        <th className={tableTh}>Listing</th>
                        <th className={tableTh}>Amount</th>
                        <th className={tableTh}>Date</th>
                        <th className={tableTh}>Review</th>
                        <th className={tableTh}> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerOrders.map((o) => (
                        <tr key={o.id}>
                          <td className={tableTd}>
                            <div className="flex max-w-[200px] items-center gap-2">
                              {o.buyer.image ? (
                                <Image
                                  src={o.buyer.image}
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 shrink-0 rounded-full border border-white/10 object-cover"
                                  alt=""
                                />
                              ) : (
                                <div className="h-6 w-6 shrink-0 rounded-full border border-white/10 bg-zinc-800" />
                              )}
                              <span className="truncate text-xs font-medium text-zinc-200">{o.buyer.name || "Buyer"}</span>
                            </div>
                          </td>
                          <td className={tableTd}>
                            <p className="max-w-[200px] truncate text-zinc-300" title={o.project.title}>
                              {o.project.title}
                            </p>
                          </td>
                          <td className={`${tableTd} whitespace-nowrap`}>
                            {formatEscrowAmountLabel(o.amount, resolvePriceCurrency(o.currency))}
                          </td>
                          <td className={`${tableTd} whitespace-nowrap text-zinc-500`}>
                            {new Date(o.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className={`${tableTd} max-w-[220px] text-sm text-zinc-400`}>
                            {o.review ? (
                              <span>
                                <span className="text-amber-400/90">★{o.review.rating}/5</span>
                                {o.review.comment?.trim()
                                  ? ` · ${o.review.comment.slice(0, 48)}${o.review.comment.length > 48 ? "…" : ""}`
                                  : ""}
                                {o.review.imageUrl ? " · photo" : ""}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className={`${tableTd} text-right`}>
                            <Link
                              href={`/p/${o.project.slug}`}
                              className="text-sm font-medium text-sky-400/90 hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ActivityBlock>
          )}

          {activity === "analytics" && (
            <ActivityBlock
              dense
              title="Seller analytics"
              subtitle="Real page views (each open of a public /p/… page, not your own) plus completed escrow. Sort below is by default: most views; sales columns are completed orders only."
            >
              {totalProjects === 0 ? (
                <p className="text-xs leading-relaxed text-zinc-500">
                  No listings yet. Create one, publish it, and open the public page from another account or a browser where you&apos;re not the operator — that counts a view. Escrow shows up after a buyer completes checkout. See{" "}
                  <Link href={buildDashboardUrl(status, "sales")} className="text-sky-400/90 underline">Sales &amp; buyers</Link> for raw rows.
                </p>
              ) : (
                <div className="space-y-4">
                  {sellerAnalytics.completedCount === 0 && (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      No <strong className="font-medium text-zinc-400">completed</strong> escrow (settled) yet — gross &amp; per-listing sales may be 0. In-flight orders are in the status table when you have any.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                    <div className="rounded-lg border border-violet-500/15 bg-violet-950/20 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-violet-200/80 sm:text-xs">Page views (all)</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white sm:text-base">
                        {sellerAnalytics.totalPageViews}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500 sm:text-xs">Public listing loads</p>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-zinc-900/40 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">Completed sales</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white sm:text-base">
                        {sellerAnalytics.completedCount}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-600 sm:text-xs">Escrow settled</p>
                    </div>
                    <div className="rounded-lg border border-sky-500/15 bg-sky-950/20 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-sky-200/80 sm:text-xs">Gross (SOL)</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-sky-100/95 sm:text-base">
                        {formatEscrowAmountLabel(sellerAnalytics.solTotal, "SOL")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500 sm:text-xs">{sellerAnalytics.solOrders} order{sellerAnalytics.solOrders === 1 ? "" : "s"}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/15 bg-emerald-950/20 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80 sm:text-xs">Gross (USDC)</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-100/95 sm:text-base">
                        {sellerAnalytics.usdcTotal > 0
                          ? formatEscrowAmountLabel(sellerAnalytics.usdcTotal, "USDC")
                          : "—"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500 sm:text-xs">
                        {sellerAnalytics.usdcOrders} order{sellerAnalytics.usdcOrders === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {sellerAnalytics.topByViews.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-violet-300/90">Top by views</p>
                        <div className="overflow-x-auto rounded-lg border border-violet-500/10">
                          <table className="w-full min-w-[220px] border-collapse text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-violet-500/15 bg-violet-950/30">
                                <th className={tableTh}>#</th>
                                <th className={tableTh}>Listing</th>
                                <th className={tableTh}>Views</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sellerAnalytics.topByViews.map((row, i) => (
                                <tr key={row.projectId} className="border-b border-white/[0.06]">
                                  <td className={`${tableTd} w-6 text-zinc-500`}>{i + 1}</td>
                                  <td className={tableTd}>
                                    <Link href={`/p/${row.slug}`} className="font-medium text-sky-400/90 hover:underline">
                                      {row.title}
                                    </Link>
                                  </td>
                                  <td className={`${tableTd} tabular-nums`}>{row.views}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-amber-200/85">Top by sales</p>
                        <div className="overflow-x-auto rounded-lg border border-amber-500/10">
                          <table className="w-full min-w-[220px] border-collapse text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-amber-500/15 bg-amber-950/20">
                                <th className={tableTh}>#</th>
                                <th className={tableTh}>Listing</th>
                                <th className={tableTh}>Sales</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sellerAnalytics.topBySales
                                .filter((row) => row.completedSales > 0)
                                .map((row, i) => (
                                <tr key={row.projectId} className="border-b border-white/[0.06]">
                                  <td className={`${tableTd} w-6 text-zinc-500`}>{i + 1}</td>
                                  <td className={tableTd}>
                                    <Link href={`/p/${row.slug}`} className="font-medium text-sky-400/90 hover:underline">
                                      {row.title}
                                    </Link>
                                  </td>
                                  <td className={`${tableTd} tabular-nums`}>{row.completedSales}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {sellerAnalytics.topBySales.every((r) => r.completedSales === 0) && (
                          <p className="mt-1 text-xs text-zinc-600">No completed sales to rank — table empty until escrow settles.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {sellerAnalytics.byStatus.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Orders by status</p>
                      <div className="overflow-x-auto rounded-lg border border-white/8">
                        <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-white/10 bg-zinc-900/60">
                              <th className={tableTh}>Status</th>
                              <th className={tableTh}>Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sellerAnalytics.byStatus.map((row) => (
                              <tr key={row.status} className="border-b border-white/[0.06]">
                                <td className={`${tableTd} font-mono text-sm text-zinc-400`}>{row.status}</td>
                                <td className={`${tableTd} tabular-nums text-zinc-200`}>{row._count._all}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {sellerAnalytics.listingReport.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Full listing report</p>
                      <p className="mb-1.5 text-xs text-zinc-600">Rows sorted by most views. Views count only public page loads; your own visits are excluded.</p>
                      <div className="overflow-x-auto rounded-lg border border-white/8">
                        <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-white/10 bg-zinc-900/60">
                              <th className={tableTh}>Listing</th>
                              <th className={tableTh}>Status</th>
                              <th className={tableTh}>Views</th>
                              <th className={tableTh}>Done sales</th>
                              <th className={tableTh}>Volume</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sellerAnalytics.listingReport
                              .sort((a, b) => b.views - a.views)
                              .map((row) => (
                                <tr key={row.projectId} className="border-b border-white/[0.06]">
                                  <td className={tableTd}>
                                    <Link href={`/p/${row.slug}`} className="font-medium text-sky-400/90 hover:underline">
                                      {row.title}
                                    </Link>
                                  </td>
                                  <td className={`${tableTd} text-sm text-zinc-500`}>
                                    {row.published ? "Live" : "Draft"}
                                  </td>
                                  <td className={`${tableTd} tabular-nums`}>{row.views}</td>
                                  <td className={`${tableTd} tabular-nums`}>{row.completedSales}</td>
                                  <td className={`${tableTd} text-zinc-400`}>
                                    {row.sol > 0 ? <span className="mr-2 inline-block">{formatEscrowAmountLabel(row.sol, "SOL")}</span> : null}
                                    {row.usdc > 0 ? <span className="inline-block">{formatEscrowAmountLabel(row.usdc, "USDC")}</span> : null}
                                    {row.sol <= 0 && row.usdc <= 0 ? "—" : null}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ActivityBlock>
          )}

          {activity === "reviews" && (
            <ActivityBlock
              dense
              title="Buyer reviews"
              subtitle="Feedback on your paid listings. Reply in the second row of each review."
            >
              {reviewAsSellerCount === 0 ? (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Reviews show up when buyers rate their purchase in Purchase history.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/8">
                  <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-zinc-900/60">
                        <th className={tableTh}>Buyer</th>
                        <th className={tableTh}>Listing</th>
                        <th className={tableTh}>Rating</th>
                        <th className={tableTh}>Date</th>
                        <th className={tableTh}>Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerOrders
                        .filter((o) => o.review)
                        .map((o) => (
                          <Fragment key={o.id}>
                            <tr>
                              <td className={tableTd}>
                                <p className="max-w-[140px] truncate font-medium text-zinc-200">{o.buyer.name || "Buyer"}</p>
                              </td>
                              <td className={tableTd}>
                                <p className="max-w-[180px] truncate text-zinc-400" title={o.project.title}>
                                  {o.project.title}
                                </p>
                              </td>
                              <td className={tableTd}>
                                {o.review && (
                                  <span className="text-amber-400/90">
                                    {o.review && "★".repeat(o.review.rating)}
                                    {o.review && <span className="text-zinc-600">{"☆".repeat(5 - o.review.rating)}</span>}
                                  </span>
                                )}
                              </td>
                              <td className={`${tableTd} whitespace-nowrap text-zinc-500`}>
                                {o.review &&
                                  new Date(o.review.createdAt).toLocaleString("en-US", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                              </td>
                              <td className={`${tableTd} max-w-[280px] text-sm text-zinc-300`}>
                                {o.review?.comment ? (
                                  <p className="line-clamp-2">{o.review.comment}</p>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className={tableTdSub} colSpan={5}>
                                <div className="flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                                  {o.review?.imageUrl ? (
                                    <div className="relative w-full max-w-[160px] shrink-0 overflow-hidden rounded border border-white/10">
                                      <Image
                                        src={o.review.imageUrl}
                                        width={320}
                                        height={240}
                                        unoptimized
                                        className="h-auto max-h-32 w-full object-cover"
                                        alt="Review"
                                      />
                                    </div>
                                  ) : null}
                                  <div className="min-w-0 flex-1">
                                    {o.review?.comment ? (
                                      <p className="text-xs leading-relaxed text-zinc-400 sm:text-sm">{o.review.comment}</p>
                                    ) : null}
                                    {o.review && (
                                      <div className="mt-2">
                                        <SellerReviewReply
                                          compact
                                          orderId={o.id}
                                          initialReply={o.review.sellerReply}
                                          initialRepliedAt={o.review.sellerRepliedAt}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ActivityBlock>
          )}

          {activity === "reports" && (
            <ActivityBlock
              dense
              title="Visitor flags on your listings"
              subtitle="Only appears when someone uses “Report listing” on your public page (spam, scam, etc.). Escrow orders and buyers are under Sales & buyers — this tab is unrelated to sales."
            >
              {incomingReports.length === 0 ? (
                <div className="space-y-3 text-xs leading-relaxed text-zinc-500">
                  <p>
                    No visitor flags yet. This stays empty until a visitor reports your listing; finishing escrow sales
                    does not add anything here.
                  </p>
                  {completedSalesAsSeller > 0 ? (
                    <div className="rounded-lg border border-sky-500/15 bg-sky-950/20 px-3 py-2.5 text-zinc-400">
                      <p className="text-sm text-zinc-300">
                        You have{" "}
                        <span className="font-medium tabular-nums text-zinc-200">{completedSalesAsSeller}</span>{" "}
                        completed sale{completedSalesAsSeller === 1 ? "" : "s"} as a seller — see them in{" "}
                        <Link
                          href={buildDashboardUrl(status, "sales")}
                          className="font-medium text-sky-400/90 underline decoration-sky-500/30 hover:text-sky-300"
                        >
                          Sales & buyers
                        </Link>
                        , not on this tab.
                      </p>
                    </div>
                  ) : null}
                </div>
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
                          className={`rounded px-1.5 py-0.5 text-xs font-medium sm:text-xs ${
                            r.status === "OPEN" ? "bg-amber-500/20 text-amber-200" : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">Listing: {r.project.title}</p>
                      <p className="text-xs text-zinc-500 sm:text-sm">
                        Reporter: {r.reporter.name || "User"}{" "}
                        {new Date(r.createdAt).toLocaleString("en-US", { dateStyle: "short" })}
                      </p>
                      {r.message ? (
                        <p className="mt-1.5 pl-0 text-sm leading-relaxed text-zinc-400 sm:text-sm">
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
                <p className="text-xs font-semibold text-white sm:text-sm">
                  <span className="inline-flex items-center">
                    <span>{session.user.name || "Creator"}</span>
                    {session.user.blueCheckmark ? (
                      <Image
                        src="/verified-badge.png"
                        alt="Verified"
                        width={12}
                        height={12}
                        className="ml-1 h-3 w-3 shrink-0"
                      />
                    ) : null}
                  </span>
                </p>
                <p className="text-xs text-zinc-500 sm:text-sm">Operator</p>
              </div>
            </div>
            <WalletLinkPanel inProfile />

            <div className="mt-2.5 space-y-1 rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-xs text-zinc-400 sm:text-sm">
              <p>
                Listing: <span className="text-zinc-200">{totalProjects}</span> (paid {paidCount})
              </p>
            </div>
            {!me?.xHandle ? <div className="mt-2"><SyncXHandleButton /></div> : null}
          </div>

          <div className="mt-0.5 space-y-3.5 border-t border-white/5 pt-2.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs sm:tracking-[0.16em]">
                Listings
              </p>
              <nav className="mt-1.5" aria-label="Listings">
                <Link
                  href={buildDashboardUrl(status, "listings")}
                  title={listingsNav.line}
                  className={`flex items-center gap-2 border-l-2 py-1.5 pl-2.5 pr-0 text-left text-sm font-medium leading-snug transition sm:py-2 sm:text-sm ${
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs sm:tracking-[0.16em]">
                Activity
              </p>
              <nav className="mt-1.5" aria-label="Escrow and visitor flags">
                <ul className="divide-y divide-white/[0.07]">
                  {escrowActivityTabs.map((t) => {
                    const active = activity === t.key;
                    const Icon = escrowMenuIcon[t.key];
                    return (
                      <li key={t.key}>
                        <Link
                          href={buildDashboardUrl(status, t.key)}
                          title={t.line}
                          className={`flex items-center gap-2 border-l-2 py-1.5 pl-2.5 pr-0 text-left text-sm font-medium leading-snug transition sm:py-2 sm:text-sm ${
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
