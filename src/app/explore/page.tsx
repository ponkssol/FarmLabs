import { auth } from "@/auth";
import { PlatformIcons } from "@/components/platform-icons";
import { XUsername } from "@/components/x-username";
import { ListingPriceLabel } from "@/components/listing-price-label";
import { ExploreFilters } from "@/components/explore-filters";
import { prisma } from "@/lib/prisma";
import {
  applyVipMaskToProject,
  fetchEscrowUnlockedProjectIds,
  resolveVipViewForProject,
} from "@/lib/viewer-listing-access";
import type { Prisma } from "@prisma/client";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Explore calls - FarmLabs",
};

type SortKey = "newest" | "oldest" | "price_asc" | "price_desc";
type PlatformKey = "ALL" | "TELEGRAM" | "DISCORD";
type TypeKey = "ALL" | "PUBLIC" | "PRIVATE";
type AccessKey = "ALL" | "FREE" | "PAID";

type Props = {
  searchParams: Promise<{
    q?: string;
    platform?: PlatformKey;
    type?: TypeKey;
    access?: AccessKey;
    sort?: SortKey;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 24;

/** Safe for Prisma queries: reject NaN/Infinity (invalid where clauses). */
function parseOptionalPrice(s: string | undefined): number | undefined {
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parsePage(s: string | undefined): number {
  if (!s) return 1;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

export default async function ExplorePage({ searchParams }: Props) {
  const {
    q,
    platform = "ALL",
    type = "ALL",
    access = "ALL",
    sort = "newest",
    minPrice,
    maxPrice,
    page,
  } = await searchParams;

  const min = parseOptionalPrice(minPrice);
  const max = parseOptionalPrice(maxPrice);
  const query = q?.trim();

  const platformFilter =
    platform === "TELEGRAM"
      ? {
          AND: [{ telegram: { not: null } }, { telegram: { not: "" } }],
        }
      : platform === "DISCORD"
        ? {
            AND: [{ discord: { not: null } }, { discord: { not: "" } }],
          }
        : {};

  const typeFilter =
    type === "PUBLIC" ? { groupType: "PUBLIC" } : type === "PRIVATE" ? { groupType: "PRIVATE" } : {};

  const accessFilter =
    access === "FREE" ? { accessType: "FREE" } : access === "PAID" ? { accessType: "PAID" } : {};

  const priceFilter =
    (min != null || max != null) && access !== "FREE"
      ? {
          accessType: "PAID",
          priceAmount: {
            ...(min != null ? { gte: min } : {}),
            ...(max != null ? { lte: max } : {}),
          },
        }
      : {};

  let orderBy: Prisma.ProjectOrderByWithRelationInput | Prisma.ProjectOrderByWithRelationInput[] = {
    createdAt: "desc",
  };
  if (sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sort === "price_asc") {
    orderBy = [{ priceAmount: "asc" }, { createdAt: "desc" }];
  } else if (sort === "price_desc") {
    orderBy = [{ priceAmount: "desc" }, { createdAt: "desc" }];
  }

  const where = {
    published: true,
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { shortPitch: { contains: query } },
            { description: { contains: query } },
            { category: { contains: query } },
            { user: { name: { contains: query } } },
            { user: { xHandle: { contains: query } } },
          ],
        }
      : {}),
    ...platformFilter,
    ...typeFilter,
    ...accessFilter,
    ...priceFilter,
  };

  const total = await prisma.project.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(parsePage(page), totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const hasActiveFilters =
    Boolean(query) ||
    platform !== "ALL" ||
    type !== "ALL" ||
    access !== "ALL" ||
    sort !== "newest" ||
    min != null ||
    max != null;

  const rawItems = await prisma.project.findMany({
    where,
    orderBy,
    skip,
    take: PAGE_SIZE,
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
  });
  const platformById = new Map(
    rawItems.map((p) => [p.id, { telegram: p.telegram, discord: p.discord }]),
  );

  const groupInitial = (title: string) => title.trim().charAt(0).toUpperCase() || "C";
  const userInitial = (name: string | null | undefined) =>
    (name?.trim() || "?").charAt(0).toUpperCase() || "?";
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  const visibleStart = Math.max(1, endPage - 4);
  const visiblePages = Array.from({ length: endPage - visibleStart + 1 }, (_, i) => visibleStart + i);
  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (platform !== "ALL") params.set("platform", platform);
    if (type !== "ALL") params.set("type", type);
    if (access !== "ALL") params.set("access", access);
    if (sort !== "newest") params.set("sort", sort);
    if (minPrice?.trim()) params.set("minPrice", minPrice.trim());
    if (maxPrice?.trim()) params.set("maxPrice", maxPrice.trim());
    if (targetPage > 1) params.set("page", String(targetPage));
    const queryString = params.toString();
    return queryString ? `/explore?${queryString}` : "/explore";
  };

  return (
    <div className="app-main-container py-4 sm:py-5">
      <section className="rounded-xl border border-white/10 bg-zinc-950/80 p-2 sm:p-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h1 className="text-xs font-semibold tracking-tight text-white sm:text-sm">Explore calls</h1>
          <span className="text-xs tabular-nums text-zinc-500">
            {total} listing{total === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-snug text-zinc-500">
          Public and VIP calls on Telegram and Discord.
        </p>

        <ExploreFilters
          q={q ?? ""}
          platform={platform}
          type={type}
          access={access}
          sort={sort}
          minPrice={minPrice ?? ""}
          maxPrice={maxPrice ?? ""}
          hasActiveFilters={hasActiveFilters}
        />
      </section>

      <section className="mt-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/60 px-4 py-6 text-center">
            <p className="text-xs text-zinc-400">No matching calls found.</p>
            <p className="mt-1 text-xs text-zinc-600">Try a broader search or clear filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
            {items.map((p) => {
              const platform = platformById.get(p.id) ?? { telegram: p.telegram, discord: p.discord };
              return (
                <article
                  key={p.id}
                  className="flex h-full flex-col rounded-xl border border-white/10 bg-zinc-950/70 p-2 transition hover:border-white/20 hover:bg-zinc-900/70"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex min-w-0 flex-1 items-start gap-1.5">
                      {p.communityImage ? (
                        <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/15 sm:h-9 sm:w-9">
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
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-xs font-semibold text-zinc-200 sm:h-9 sm:w-9">
                          {groupInitial(p.title)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 pt-0.5 sm:pt-0.5">
                        <p className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-100 sm:text-sm">
                          {p.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                      {p.accessType === "PAID" ? (
                        <span className="rounded-full border border-amber-300/70 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-semibold leading-none tracking-[0.08em] text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.4)]">
                          VIP
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 px-1 py-px text-[9px] font-medium leading-none tracking-wide text-zinc-500">
                          Open
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-[8px] leading-snug text-zinc-500/90 sm:text-[9px] sm:leading-relaxed">
                    {p.shortPitch}
                  </p>

                  <div className="mt-1.5 flex min-w-0 items-center justify-between gap-1.5 border-t border-white/10 pt-1.5 text-[9px] leading-tight sm:text-[10px] sm:gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      {p.user.image ? (
                        <Image
                          src={p.user.image}
                          alt={p.user.name || "Creator"}
                          width={14}
                          height={14}
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-[8px] font-semibold leading-none text-zinc-300"
                          aria-hidden
                        >
                          {userInitial(p.user.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex flex-1 items-center text-zinc-400">
                        <span className="inline-flex min-w-0 max-w-full items-center leading-none">
                          <XUsername
                            name={p.user.name || "Anonymous"}
                            xHandle={p.user.xHandle}
                            xUserId={p.user.accounts?.[0]?.providerAccountId}
                            className="block truncate text-zinc-300"
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
                      </div>
                    </div>
                    <span className="shrink-0 text-right text-inherit text-zinc-300">
                      <ListingPriceLabel
                        project={p}
                        priceOptions={p.priceOptions}
                        compact
                        textClassName="text-inherit font-medium tabular-nums"
                      />
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Link
                      href={`/p/${p.slug}`}
                      className="inline-flex h-6 flex-1 items-center justify-center rounded-md border border-white/15 px-1.5 text-[11px] font-medium text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
                    >
                      View detail
                    </Link>
                    <PlatformIcons
                      telegram={platform.telegram}
                      discord={platform.discord}
                      iconClassName="h-2.5 w-2.5 text-zinc-400"
                      hideIfEmpty
                      boxed
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {totalPages > 1 ? (
        <nav className="mt-3 flex items-center justify-center gap-1.5" aria-label="Explore pagination">
          <Link
            href={buildPageHref(Math.max(1, currentPage - 1))}
            scroll={false}
            aria-disabled={currentPage === 1}
            className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
              currentPage === 1
                ? "pointer-events-none cursor-not-allowed border-white/5 text-zinc-600"
                : "border-white/15 text-zinc-300 hover:border-white/30 hover:bg-zinc-900/70"
            }`}
          >
            Prev
          </Link>
          {visiblePages.map((p) => (
            <Link
              key={p}
              href={buildPageHref(p)}
              scroll={false}
              aria-current={p === currentPage ? "page" : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold tabular-nums transition-colors ${
                p === currentPage
                  ? "border-white/30 bg-zinc-100 text-zinc-900"
                  : "border-white/15 text-zinc-300 hover:border-white/30 hover:bg-zinc-900/70"
              }`}
            >
              {p}
            </Link>
          ))}
          <Link
            href={buildPageHref(Math.min(totalPages, currentPage + 1))}
            scroll={false}
            aria-disabled={currentPage === totalPages}
            className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
              currentPage === totalPages
                ? "pointer-events-none cursor-not-allowed border-white/5 text-zinc-600"
                : "border-white/15 text-zinc-300 hover:border-white/30 hover:bg-zinc-900/70"
            }`}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </div>
  );
}




