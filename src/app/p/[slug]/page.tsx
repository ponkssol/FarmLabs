import { auth } from "@/auth";
import { escrowEligible, formatEscrowAmountLabel, formatListingPrice, resolvePriceCurrency } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import { redactVipSocialLinks } from "@/lib/redact-vip-text";
import { isPaidVipListing } from "@/lib/vip-link-access";
import {
  fetchActiveEscrowAccessForProject,
  fetchEscrowUnlockedProjectIds,
  resolveVipViewForProject,
} from "@/lib/viewer-listing-access";
import { CommunityReviewsSection } from "@/components/community-reviews";
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
        `UPDATE "Project" SET "viewCount" = COALESCE("viewCount", 0) + 1 WHERE "id" = ?`,
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
    <article className="app-container isolate py-5 sm:py-6">
      <nav className="mb-4 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <Link href="/explore" className="transition hover:text-zinc-300">
          ← Explore
        </Link>
        <span className="uppercase tracking-widest text-zinc-600">Listing</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 lg:col-span-8">
          <header className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 px-3.5 py-3.5 sm:px-4 sm:py-4">
            <div className="flex items-start gap-2.5">
              {p.communityImage ? (
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:h-12 sm:w-12">
                  <Image
                    src={p.communityImage}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Community call</p>
                <h1 className="mt-1 text-base font-semibold leading-snug tracking-tight text-white sm:text-[17px]">
                  {p.title}
                </h1>
              </div>
            </div>
            {isOwner && isPaidVipListing(p) && (
              <p className="mb-0 mt-3 rounded border border-amber-500/20 bg-amber-950/25 px-2.5 py-2 text-[10px] leading-relaxed text-amber-200/90">
                You own this listing: the public page matches what visitors see—community links and URLs stay hidden
                until someone completes escrow checkout. View or edit links in the dashboard.
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">{shortPitchText}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              {p.user.image ? (
                <Image
                  src={p.user.image}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full border border-white/10 object-cover"
                  alt={p.user.name || "Operator"}
                />
              ) : (
                <div className="h-7 w-7 rounded-full border border-white/10 bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-200">
                  <XUsername
                    name={p.user.name || "Operator"}
                    xHandle={p.user.xHandle}
                    xUserId={p.user.accounts?.[0]?.providerAccountId}
                  />
                </p>
                {p.user.wallet && (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">{p.user.wallet}</p>
                )}
              </div>
            </div>
          </header>

          {detailImages.length > 0 && (
            <section
              className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 p-3 sm:p-3.5"
              aria-label="Community images"
            >
              <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-zinc-500 sm:text-[9px] sm:tracking-[0.16em]">
                Gallery
              </p>
              <ListingGallery images={detailImages} />
            </section>
          )}

          {(p.description?.trim() || links.length > 0 || (maskVipLinks && isPaidVipListing(p) && hasLinkOffers)) && (
            <section className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90">
              {p.description?.trim() ? (
                <>
                  <div className="border-b border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">About</h2>
                  </div>
                  <div className="px-3.5 py-3 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:py-3.5 sm:text-xs sm:leading-relaxed">
                    {redactVipText && (
                      <p className="mb-3 border border-amber-500/15 bg-amber-950/20 px-2.5 py-2 text-[10px] leading-relaxed text-amber-200/90">
                        Paid access: links to Telegram, X, and Discord in this description stay hidden until escrow
                        checkout is complete.
                      </p>
                    )}
                    <div className="break-words whitespace-pre-wrap">{aboutText}</div>
                  </div>
                </>
              ) : null}
              {(links.length > 0 || (maskVipLinks && isPaidVipListing(p) && hasLinkOffers)) && (
                <div
                  className={`px-3.5 py-3 sm:px-4 sm:py-3.5 ${p.description?.trim() ? "border-t border-white/10" : ""}`}
                >
                  {maskVipLinks ? (
                    <div className="space-y-2">
                      <p className="text-[10px] leading-relaxed text-amber-200/90 sm:text-[11px]">
                        Community links on Telegram and Discord are hidden until you join. They appear here after
                        that.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
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
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-950/20 px-2 py-1 text-[10px] text-amber-200/80"
                            title="After you join"
                          >
                            {l.label}
                            <span className="text-amber-200/50">· locked</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {links.map((l) => (
                          <a
                            key={l.label}
                            href={l.href!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-white/12 px-2 py-1 text-[10px] text-zinc-300 transition hover:border-white/25 hover:text-white"
                          >
                            {l.label}
                          </a>
                        ))}
                      </div>
                      {accessRow?.accessExpiresAt ? (
                        <p className="text-[9px] text-zinc-500" suppressHydrationWarning>
                          Access active until{" "}
                          {new Date(accessRow.accessExpiresAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {accessRow.priceOptionLabel ? ` · ${accessRow.priceOptionLabel}` : ""}
                        </p>
                      ) : null}
                      {accessRow?.grantedDiscordRoleId ? (
                        <p className="text-[9px] leading-relaxed text-zinc-500">
                          Discord role ID for this purchase (for the server bot):{" "}
                          <code className="rounded border border-white/10 bg-zinc-900/80 px-1 py-0.5 text-[8px] text-zinc-400">
                            {accessRow.grantedDiscordRoleId}
                          </code>
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {p.rules?.trim() ? (
            <section className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90">
              <div className="border-b border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Rules</h2>
              </div>
              <div className="px-3.5 py-3 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:py-3.5 sm:text-xs sm:whitespace-pre-wrap break-words">
                {rulesText}
              </div>
            </section>
          ) : null}

          {p.deliveryPolicy?.trim() ? (
            <section className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90">
              <div className="border-b border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">How access works</h2>
              </div>
              <div className="px-3.5 py-3 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:py-3.5 sm:text-xs sm:whitespace-pre-wrap break-words">
                {policyText}
              </div>
            </section>
          ) : null}

          <CommunityReviewsSection
            items={communityReviewItems}
            averageRating={reviewAverage}
            count={reviewCount}
          />
        </div>

        <aside className="min-w-0 lg:col-span-4">
          <div className="flex flex-col gap-3 sm:gap-3.5 lg:sticky lg:top-20">
            <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95">
              <div className="border-b border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</h2>
              </div>
              <dl className="divide-y divide-white/5 px-3.5 text-[11px] sm:px-4">
                <div className="flex items-center justify-between gap-2 py-2">
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="font-medium text-zinc-200">{typeLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2">
                  <dt className="text-zinc-500">Access</dt>
                  <dd className="font-medium text-zinc-200">{accessLabel}</dd>
                </div>
                {showPriceRow && (
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="text-zinc-500">Price</dt>
                    <dd className="font-medium text-zinc-200">{formatListingPrice(p, p.priceOptions)}</dd>
                  </div>
                )}
                {p.category && (
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="text-zinc-500">Niche</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-zinc-200">{p.category}</dd>
                  </div>
                )}
              </dl>
            </section>

            {canEscrow ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-3 sm:px-4 sm:py-3.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
                  Join communities
                </h3>
                {showSidebarInviteLinks ? (
                  <div className="mt-2.5 space-y-2.5 text-[10px]">
                    <p className="text-emerald-200/90">You’re in — use your invites below.</p>
                    <p className="text-[9px] text-zinc-500">
                      <Link
                        href="/dashboard?activity=purchases"
                        className="text-cyan-400/90 underline-offset-2 hover:underline"
                      >
                        View purchase &amp; saved links in dashboard
                      </Link>{" "}
                      — they stay here after refresh.
                    </p>
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
                      {effectiveTg ? (
                        <a
                          href={effectiveTg}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-[10px] font-medium text-white transition hover:border-white/25 sm:w-auto"
                        >
                          Open Telegram
                        </a>
                      ) : null}
                      {effectiveDc ? (
                        <a
                          href={effectiveDc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-2 text-[10px] font-medium text-indigo-100 transition hover:border-indigo-400/50 sm:w-auto"
                        >
                          Open Discord
                        </a>
                      ) : null}
                    </div>
                    {accessRow?.accessExpiresAt ? (
                      <p className="text-[9px] text-zinc-500" suppressHydrationWarning>
                        Access through{" "}
                        {new Date(accessRow.accessExpiresAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {accessRow.priceOptionLabel ? ` · ${accessRow.priceOptionLabel}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : showPaidNoLinksNote ? (
                  <p className="mt-2.5 text-[9px] text-zinc-500">
                    No invite link stored for this purchase — ask the host to add one in the dashboard.
                  </p>
                ) : (
                  <>
                    {!escrowLabel && (
                      <p className="mt-2 text-[10px] leading-relaxed text-zinc-400 sm:text-[11px]">
                        Connect a wallet to continue.
                      </p>
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
              <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-3.5 py-3 text-[10px] leading-relaxed text-zinc-500 sm:px-4 sm:py-3.5 sm:text-[11px]">
                {p.accessType === "FREE"
                  ? "This is a public or free listing. No checkout required."
                  : "Checkout is not required for this listing type."}
              </div>
            )}

            <div className="space-y-2.5">
              <Link
                href="/explore"
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/12 px-2.5 py-1.5 text-[10px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              >
                View more listings
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
    </article>
  );
}
