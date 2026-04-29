import { auth } from "@/auth";
import { ListingPriceLabel } from "@/components/listing-price-label";
import { escrowEligible, formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import { redactVipSocialLinks } from "@/lib/redact-vip-text";
import { isPaidVipListing } from "@/lib/vip-link-access";
import {
  fetchActiveEscrowAccessForProject,
  fetchEscrowUnlockedProjectIds,
  resolveVipViewForProject,
} from "@/lib/viewer-listing-access";
import { CommunityReviewsSection } from "@/components/community-reviews";
import { ListingDetailTabs, type ListingTabSpec } from "@/components/listing-detail-tabs";
import { ReportListingButton } from "@/components/dashboard/report-listing-button";
import { EscrowBuyButton } from "@/components/escrow-buy-button";
import type { Metadata } from "next";
import { XUsername } from "@/components/x-username";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingGallery } from "@/components/listing-gallery";
import { parseDetailImagesJson } from "@/lib/project-detail-images";

function strOrEmpty(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

/** Hide accidental console / dev log pasted as pitch */
function isLikelyDevOrConsoleNoise(text: string): boolean {
  return /[\w./-]+\.tsx:\d+/i.test(text) || /solana-provider|registerDefaultProvider|removed from your app|Phantom was registered/i.test(text);
}

function pickRandom<T>(items: T[], n: number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.project.findUnique({ where: { slug } });
  if (!p || !p.published) return { title: "Not found" };
  const publicShortPitch =
    p.accessType === "PAID" && p.shortPitch
      ? redactVipSocialLinks(p.shortPitch)
      : p.shortPitch;
  return {
    title: `${p.title} - FarmLabs`,
    description: publicShortPitch,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const p = await prisma.project.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          name: true,
          image: true,
          wallet: true,
          blueCheckmark: true,
          xHandle: true,
          accounts: {
            where: { provider: "twitter" },
            take: 1,
            select: { providerAccountId: true },
          },
        },
      },
      priceOptions: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p || !p.published) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;
  /** One view per page load; skip operator so analytics stay buyer-focused. */
  if (viewerId == null || viewerId !== p.userId) {
    /** Raw SQL: works if Prisma Client is stale (e.g. `viewCount` not in DMMF) or generate failed (EPERM on Windows). */
    void prisma
      .$executeRawUnsafe(
        `UPDATE "Project" SET "viewCount" = COALESCE("viewCount", 0) + 1 WHERE "id" = $1`,
        p.id,
      )
      .catch(() => {});
  }

  const unlocked = await fetchEscrowUnlockedProjectIds(viewerId, [p.id]);
  const { isOwner, maskVipLinks, redactVipText } = resolveVipViewForProject(
    p,
    viewerId,
    unlocked,
    p.priceOptions,
  );
  const accessRow =
    viewerId && unlocked.has(p.id) ? await fetchActiveEscrowAccessForProject(viewerId, p.id) : null;
  const aboutText = redactVipText && p.description ? redactVipSocialLinks(p.description) : p.description;
  const shortPitchText = redactVipText && p.shortPitch ? redactVipSocialLinks(p.shortPitch) : p.shortPitch;
  const rulesText = redactVipText && p.rules ? redactVipSocialLinks(p.rules) : p.rules;
  const policyText = redactVipText && p.deliveryPolicy ? redactVipSocialLinks(p.deliveryPolicy) : p.deliveryPolicy;

  const grantedSnapTg = strOrEmpty(accessRow?.grantedTelegramUrl);
  const grantedSnapDc = strOrEmpty(accessRow?.grantedDiscordUrl);
  /** Tier on this order (relation) or same id on the listing (if relation is missing / stale). */
  const tierRowFromListing =
    accessRow?.priceOptionId != null
      ? p.priceOptions?.find((o) => o.id === accessRow.priceOptionId) ?? null
      : null;
  const tierTg =
    strOrEmpty(accessRow?.priceOption?.telegramUrl) ?? strOrEmpty(tierRowFromListing?.telegramUrl);
  const tierDc =
    strOrEmpty(accessRow?.priceOption?.discordUrl) ?? strOrEmpty(tierRowFromListing?.discordUrl);
  const fromProjectTg = strOrEmpty(p.telegram);
  const fromProjectDc = strOrEmpty(p.discord);
  /**
   * Tier purchase: snapshot → that tier’s invites → then listing-wide defaults.
   * No tier: snapshot → project links.
   */
  const effectiveTg = accessRow?.priceOptionId
    ? (grantedSnapTg ?? tierTg ?? fromProjectTg)
    : (grantedSnapTg ?? fromProjectTg);
  const effectiveDc = accessRow?.priceOptionId
    ? (grantedSnapDc ?? tierDc ?? fromProjectDc)
    : (grantedSnapDc ?? fromProjectDc);
  const links = [
    { label: "Telegram" as const, href: effectiveTg },
    { label: "Discord" as const, href: effectiveDc },
  ].filter((x): x is { label: "Telegram" | "Discord"; href: string } => Boolean(x.href));
  const typeLabel = p.groupType === "PUBLIC" ? "Public" : "Private";
  const accessLabel = p.accessType === "PAID" ? "VIP" : "Open";
  const showPriceRow = p.groupType !== "PUBLIC";
  const priceOpts = p.priceOptions?.filter((o) => o.priceAmount > 0) ?? [];
  const offersTelegram =
    Boolean(p.telegram?.trim()) || priceOpts.some((o) => (o.telegramUrl?.trim() ?? "").length > 0);
  const offersDiscord =
    Boolean(p.discord?.trim()) || priceOpts.some((o) => (o.discordUrl?.trim() ?? "").length > 0);
  const hasLinkOffers = offersTelegram || offersDiscord;
  const canEscrow = escrowEligible(p, priceOpts);
  const hasBoughtAccess = Boolean(viewerId && unlocked.has(p.id));
  const minEscrowAmount =
    priceOpts.length > 0 ? Math.min(...priceOpts.map((o) => o.priceAmount)) : p.priceAmount ?? 0;
  const escrowLabel =
    canEscrow && minEscrowAmount > 0
      ? formatEscrowAmountLabel(minEscrowAmount, resolvePriceCurrency(p.priceCurrency))
      : null;
  const showSidebarInviteLinks = hasBoughtAccess && Boolean(effectiveTg || effectiveDc);
  const showPaidNoLinksNote = hasBoughtAccess && !effectiveTg && !effectiveDc;
  /** VIP checkout box already shows Open Telegram/Discord; avoid duplicating a second link card. */
  const communityLinksInEscrowCard = canEscrow && showSidebarInviteLinks;
  const showSidebarCommunityLinkCard =
    (links.length > 0 || (maskVipLinks && isPaidVipListing(p) && hasLinkOffers)) &&
    !communityLinksInEscrowCard;
  const detailImages = parseDetailImagesJson(p.detailImages);

  const [reviewAgg, reviewRows] = await Promise.all([
    prisma.escrowReview.aggregate({
      where: { order: { projectId: p.id } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.escrowReview.findMany({
      where: { order: { projectId: p.id } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        order: {
          select: {
            buyer: {
              select: {
                name: true,
                image: true,
                xHandle: true,
                accounts: {
                  where: { provider: "twitter" },
                  take: 1,
                  select: { providerAccountId: true },
                },
              },
            },
            seller: {
              select: {
                name: true,
                image: true,
                xHandle: true,
                accounts: {
                  where: { provider: "twitter" },
                  take: 1,
                  select: { providerAccountId: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  const relatedByCategoryPool = p.category
    ? await prisma.project.findMany({
        where: {
          published: true,
          id: { not: p.id },
          category: p.category,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          slug: true,
          title: true,
          shortPitch: true,
          accessType: true,
          groupType: true,
          priceAmount: true,
          priceCurrency: true,
          communityImage: true,
          user: {
            select: {
              name: true,
              xHandle: true,
              accounts: {
                where: { provider: "twitter" },
                take: 1,
                select: { providerAccountId: true },
              },
            },
          },
        },
      })
    : [];
  const relatedByCategory = pickRandom(relatedByCategoryPool, 5);
  const relatedFallback =
    relatedByCategory.length < 5
      ? await prisma.project.findMany({
          where: {
            published: true,
            id: { notIn: [p.id, ...relatedByCategory.map((x) => x.id)] },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            slug: true,
            title: true,
            shortPitch: true,
            accessType: true,
            groupType: true,
            priceAmount: true,
            priceCurrency: true,
            communityImage: true,
            user: {
              select: {
                name: true,
                xHandle: true,
                accounts: {
                  where: { provider: "twitter" },
                  take: 1,
                  select: { providerAccountId: true },
                },
              },
            },
          },
        })
      : [];
  const recommendedItems = [
    ...relatedByCategory,
    ...pickRandom(relatedFallback, 5 - relatedByCategory.length),
  ];

  const communityReviewItems = reviewRows.map((r) => {
    const buyer = r.order.buyer;
    const seller = r.order.seller;
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt.toISOString(),
      sellerReply: r.sellerReply,
      sellerRepliedAt: r.sellerRepliedAt?.toISOString() ?? null,
      buyer: {
        name: buyer.name,
        image: buyer.image,
        xHandle: buyer.xHandle,
        xUserId: buyer.accounts[0]?.providerAccountId ?? null,
      },
      operator: {
        name: seller.name,
        image: seller.image,
        xHandle: seller.xHandle,
        xUserId: seller.accounts[0]?.providerAccountId ?? null,
      },
    };
  });
  const reviewAverage = reviewAgg._avg.rating ?? 0;
  const reviewCount = reviewAgg._count._all;

  return (
    <article className="app-container isolate py-4 sm:py-5">
      <nav className="mb-2.5 flex min-w-0 items-center gap-1.5 text-[10px] text-zinc-500 sm:mb-3 sm:text-[11px]">
        <Link href="/explore" className="shrink-0 transition hover:text-zinc-300">
          Explore
        </Link>
        <span className="text-zinc-600" aria-hidden>
          /
        </span>
        <span className="min-w-0 truncate text-zinc-500">{p.title}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-span-8">
          <header className="overflow-hidden rounded-2xl border border-white/[0.04] bg-zinc-900/20 ring-1 ring-inset ring-white/[0.02]">
            <div className="p-4 sm:p-4">
              <div className="flex gap-3.5 sm:gap-5">
                {p.communityImage ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-950/80 ring-1 ring-white/[0.06] sm:h-32 sm:w-32">
                    <Image
                      src={p.communityImage}
                      alt=""
                      fill
                      unoptimized
                      className="object-contain object-center p-0"
                      sizes="(max-width: 640px) 96px, 128px"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-500 sm:text-[11px]">
                    <span className="text-zinc-400">{typeLabel}</span>
                    <span className="mx-1.5 text-zinc-600">·</span>
                    <span className="text-zinc-400">{accessLabel}</span>
                    {p.category ? (
                      <>
                        <span className="mx-1.5 text-zinc-600">·</span>
                        <span className="text-zinc-500">{p.category}</span>
                      </>
                    ) : null}
                  </p>
                  <h1 className="mt-1 text-base font-semibold leading-snug tracking-tight text-zinc-50 sm:text-[1.05rem]">
                    {p.title}
                  </h1>
                  {shortPitchText && !isLikelyDevOrConsoleNoise(shortPitchText) ? (
                    <p
                      className="mt-1.5 line-clamp-2 max-w-2xl text-xs leading-relaxed text-zinc-500"
                      title={shortPitchText}
                    >
                      {shortPitchText}
                    </p>
                  ) : null}
                  {isOwner && isPaidVipListing(p) ? (
                    <p className="mt-2 text-[10px] leading-relaxed text-amber-200/75 sm:text-[11px]">
                      <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-200/90">Owner</span>
                      <span className="ml-1.5">Links stay hidden until checkout — </span>
                      <Link
                        href="/dashboard"
                        className="font-medium text-amber-200 underline decoration-amber-500/30 underline-offset-2 transition hover:decoration-amber-400/50"
                      >
                        Edit listing
                      </Link>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-white/[0.05] pt-4">
                {p.user.image ? (
                  <Image
                    src={p.user.image}
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                    alt={p.user.name || "Operator"}
                  />
                ) : (
                  <div className="h-5 w-5 shrink-0 rounded-full bg-zinc-800 ring-1 ring-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-200">
                    <span className="inline-flex min-w-0 max-w-full items-center">
                      <XUsername
                        name={p.user.name || "Operator"}
                        xHandle={p.user.xHandle}
                        xUserId={p.user.accounts?.[0]?.providerAccountId}
                        className="truncate"
                      />
                      {p.user.blueCheckmark ? (
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
                </div>
              </div>
            </div>
          </header>

          {(() => {
            const showDescriptionTab = Boolean(p.description?.trim());
            const hasRules = Boolean(p.rules?.trim());
            const hasAccess = Boolean(p.deliveryPolicy?.trim());
            const tabs: ListingTabSpec[] = [];
            if (showDescriptionTab) {
              tabs.push({
                id: "description",
                label: "Description",
                content: (
                  <div>
                    {p.description?.trim() ? (
                      <div>
                        {redactVipText && (
                          <p className="mb-2 rounded-md border border-amber-500/20 bg-amber-950/15 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/90 sm:text-[11px]">
                            Paid access: community links in this text stay hidden until checkout completes.
                          </p>
                        )}
                        <div className="max-w-2xl break-words text-zinc-300/95">
                          <div className="whitespace-pre-wrap">{aboutText}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ),
              });
            }
            if (hasRules) {
              tabs.push({
                id: "rules",
                label: "Rules",
                content: (
                  <div className="whitespace-pre-wrap break-words text-inherit">
                    {rulesText}
                  </div>
                ),
              });
            }
            if (hasAccess) {
              tabs.push({
                id: "access",
                label: "Access",
                content: (
                  <div className="whitespace-pre-wrap break-words text-inherit">
                    {policyText}
                  </div>
                ),
              });
            }
            const reviewLabel =
              reviewCount > 0 ? `Reviews · ${reviewCount}` : "Reviews";
            tabs.push({
              id: "reviews",
              label: reviewLabel,
              content: (
                <CommunityReviewsSection
                  items={communityReviewItems}
                  averageRating={reviewAverage}
                  count={reviewCount}
                  embedInTabs
                />
              ),
            });
            return <ListingDetailTabs tabs={tabs} defaultId={tabs[0]!.id} />;
          })()}

          {detailImages.length > 0 && (
            <section
              className="overflow-hidden rounded-2xl border border-white/[0.04] bg-zinc-900/20 p-3 ring-1 ring-inset ring-white/[0.02] sm:p-3.5"
              aria-label="Community images"
            >
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:text-[11px]">
                Photos
              </h2>
              <div className="mt-2">
                <ListingGallery images={detailImages} compact />
              </div>
            </section>
          )}

        </div>

        <aside className="min-w-0 lg:col-span-4">
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-white/[0.04] bg-zinc-900/20 ring-1 ring-inset ring-white/[0.02]">
              <div className="border-b border-white/[0.05] px-4 py-3 sm:px-4 sm:py-3.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:text-[11px]">From</p>
                {showPriceRow ? (
                  <div className="mt-1 min-h-[1.25rem]">
                    <ListingPriceLabel
                      project={p}
                      priceOptions={p.priceOptions}
                      className="items-baseline gap-0.5"
                      textClassName="text-base font-semibold text-white tabular-nums sm:text-lg"
                      largeMark
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-xs font-medium text-zinc-300 sm:text-sm">Free to view</p>
                )}
              </div>
              <dl className="divide-y divide-white/[0.04] px-4 text-xs sm:px-4 sm:text-sm">
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="text-right font-medium text-zinc-200">{typeLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-zinc-500">Access</dt>
                  <dd className="text-right font-medium text-zinc-200">{accessLabel}</dd>
                </div>
                {p.category && (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <dt className="text-zinc-500">Niche</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-zinc-200">{p.category}</dd>
                  </div>
                )}
              </dl>
            </div>

            {canEscrow ? (
              <div className="overflow-hidden rounded-2xl border border-emerald-500/15 bg-emerald-950/10 px-4 py-3 ring-1 ring-inset ring-emerald-500/5 sm:px-4 sm:py-3.5">
                <h3 className="text-xs font-semibold text-emerald-200/90 sm:text-sm">Get access</h3>
                {showSidebarInviteLinks ? (
                  <div className="mt-2.5 space-y-2 text-xs sm:text-sm">
                    <p className="text-emerald-200/90">You’re in — your links are below.</p>
                    <p className="text-[11px] text-zinc-500 sm:text-xs">
                      <Link
                        href="/dashboard?activity=purchases"
                        className="text-cyan-400/90 underline-offset-2 hover:underline"
                      >
                        Dashboard
                      </Link>{" "}
                      has your saved links too.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {effectiveTg ? (
                        <a
                          href={effectiveTg}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-zinc-950 transition hover:bg-zinc-200 sm:text-sm"
                        >
                          Open Telegram
                        </a>
                      ) : null}
                      {effectiveDc ? (
                        <a
                          href={effectiveDc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-950/50 px-3 py-2 text-xs font-medium text-indigo-100 transition hover:bg-indigo-900/50 sm:text-sm"
                        >
                          Open Discord
                        </a>
                      ) : null}
                    </div>
                    {accessRow?.accessExpiresAt ? (
                      <p className="text-xs text-zinc-500" suppressHydrationWarning>
                        Until{" "}
                        {new Date(accessRow.accessExpiresAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {accessRow.priceOptionLabel ? ` · ${accessRow.priceOptionLabel}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : showPaidNoLinksNote ? (
                  <p className="mt-2.5 text-xs text-zinc-500">
                    No invite link stored for this purchase — ask the host to add one in the dashboard.
                  </p>
                ) : (
                  <>
                    {!escrowLabel && (
                      <p className="mt-2 text-sm text-zinc-500">Connect a wallet to see checkout.</p>
                    )}
                    <div className="mt-3">
                      <EscrowBuyButton
                        key={p.id}
                        projectId={p.id}
                        amountLabel={escrowLabel ?? undefined}
                        priceCurrency={p.priceCurrency}
                        priceOptions={priceOpts.map((o) => ({
                          id: o.id,
                          label: o.label,
                          priceAmount: o.priceAmount,
                        }))}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.04] bg-zinc-900/20 px-4 py-3 text-xs text-zinc-500 ring-1 ring-inset ring-white/[0.02] sm:text-sm">
                {p.accessType === "FREE"
                  ? "Public / free access — no checkout."
                  : "No checkout for this listing type."}
              </div>
            )}

            {showSidebarCommunityLinkCard ? (
              <div className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-950/35 via-zinc-900/40 to-zinc-950/50 px-4 py-3 shadow-[0_0_32px_-10px_rgba(34,211,238,0.35)] ring-1 ring-cyan-400/20 ring-inset sm:px-4 sm:py-3.5">
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-cyan-400/[0.04]"
                  aria-hidden
                />
                <h3 className="relative text-[10px] font-medium uppercase tracking-wider text-cyan-100/90 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)] sm:text-[11px]">
                  Community links
                </h3>
                {maskVipLinks ? (
                  <div className="relative mt-2.5 space-y-1.5">
                    <p className="text-[10px] leading-relaxed text-amber-200/90 sm:text-[11px]">
                      Join to unlock Telegram &amp; Discord — links show here after purchase.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        ...(offersTelegram
                          ? [{ label: "Telegram" as const, href: null as string | null }]
                          : []),
                        ...(offersDiscord
                          ? [{ label: "Discord" as const, href: null as string | null }]
                          : []),
                      ].map((l) => (
                        <span
                          key={l.label}
                          className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/30 bg-amber-950/25 px-2 py-0.5 text-[10px] text-amber-100/95 shadow-[0_0_14px_-3px_rgba(251,191,36,0.35)] sm:text-[11px]"
                          title="After you join"
                        >
                          {l.label}
                          <span className="text-amber-200/50">· locked</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-2.5 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {links.map((l) => (
                        <a
                          key={l.label}
                          href={l.href!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-full border border-cyan-400/35 bg-gradient-to-b from-zinc-800/90 to-zinc-950/95 px-2.5 py-1 text-[10px] font-medium text-cyan-50 shadow-[0_0_16px_-4px_rgba(34,211,238,0.4)] transition hover:border-cyan-300/55 hover:shadow-[0_0_22px_-2px_rgba(34,211,238,0.55)] hover:brightness-110 sm:text-[11px]"
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                    {accessRow?.accessExpiresAt ? (
                      <p className="text-[10px] text-zinc-500 sm:text-[11px]" suppressHydrationWarning>
                        Access active until{" "}
                        {new Date(accessRow.accessExpiresAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {accessRow.priceOptionLabel ? ` · ${accessRow.priceOptionLabel}` : ""}
                      </p>
                    ) : null}
                    {accessRow?.grantedDiscordRoleId ? (
                      <p className="text-[10px] leading-relaxed text-zinc-500 sm:text-[11px]">
                        Discord role ID for this purchase (for the server bot):{" "}
                        <code className="rounded border border-white/10 bg-zinc-900/80 px-1 py-0.5 text-[10px] text-zinc-400 sm:text-[11px]">
                          {accessRow.grantedDiscordRoleId}
                        </code>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Link
                href="/explore"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900/20 py-2 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-white/[0.02] transition hover:border-white/15 hover:bg-zinc-900/40 hover:text-white sm:text-sm"
              >
                More listings
              </Link>
              <ReportListingButton
                projectId={p.id}
                isOwner={isOwner}
                isLoggedIn={!!session?.user}
                callbackPath={`/p/${slug}`}
              />
            </div>
          </div>
        </aside>
      </div>
      {recommendedItems.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-zinc-900/35 to-zinc-950/65 p-3 ring-1 ring-inset ring-white/[0.03] sm:p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 sm:text-[11px]">
                Recommended listings
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-600 sm:text-xs">Similar and recent communities you may like</p>
            </div>
            <Link href="/explore" className="text-[11px] text-zinc-500 transition hover:text-zinc-300 sm:text-xs">
              View all
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {recommendedItems.map((item) => {
              const itemShortPitch =
                item.accessType === "PAID" && item.shortPitch
                  ? redactVipSocialLinks(item.shortPitch)
                  : item.shortPitch;
              return (
                <Link
                  key={item.id}
                  href={`/p/${item.slug}`}
                  className="group rounded-xl border border-white/10 bg-zinc-950/60 p-2.5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-900/65"
                >
                  <div className="flex items-start gap-2.5">
                    {item.communityImage ? (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10">
                        <Image src={item.communityImage} alt="" fill unoptimized className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-sm font-semibold text-zinc-400">
                        {(item.title || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100 transition group-hover:text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{itemShortPitch}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      {item.groupType === "PUBLIC" ? "Public" : "Private"}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-300">
                      {item.accessType === "PAID"
                        ? `VIP${item.priceAmount ? ` · ${formatEscrowAmountLabel(item.priceAmount, resolvePriceCurrency(item.priceCurrency))}` : ""}`
                        : "Open"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
