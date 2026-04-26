import { auth } from "@/auth";
import { PlatformIcons } from "@/components/platform-icons";
import { XUsername } from "@/components/x-username";
import { formatListingPrice } from "@/lib/listing-price";
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
  }>;
};

/** Safe for Prisma queries: reject NaN/Infinity (invalid where clauses). */
function parseOptionalPrice(s: string | undefined): number | undefined {
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
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
  } = await searchParams;

  const min = parseOptionalPrice(minPrice);
  const max = parseOptionalPrice(maxPrice);

  const platformFilter =
    platform === "TELEGRAM"
      ? { telegram: { not: null } }
      : platform === "DISCORD"
        ? { discord: { not: null } }
        : {};

  const typeFilter =
    type === "PUBLIC" ? { groupType: "PUBLIC" } : type === "PRIVATE" ? { groupType: "PRIVATE" } : {};

  const accessFilter =
    access === "FREE" ? { accessType: "FREE" } : access === "PAID" ? { accessType: "PAID" } : {};

  const priceFilter =
    min != null || max != null
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
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { shortPitch: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {}),
    ...platformFilter,
    ...typeFilter,
    ...accessFilter,
    ...priceFilter,
  };

  const hasActiveFilters =
    Boolean(q) ||
    platform !== "ALL" ||
    type !== "ALL" ||
    access !== "ALL" ||
    sort !== "newest" ||
    min != null ||
    max != null;

  const [rawItems, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      take: 48,
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
      },
    }),
    prisma.project.count({ where }),
  ]);

  const session = await auth();
  const viewerId = session?.user?.id;
  const unlocked = await fetchEscrowUnlockedProjectIds(
    viewerId,
    rawItems.map((p) => p.id),
  );
  const items = rawItems.map((p) => {
    const state = resolveVipViewForProject(p, viewerId, unlocked);
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

  return (
    <div className="app-container py-4 sm:py-5">
      <section className="rounded-xl border border-white/10 bg-zinc-950/80 p-2.5 sm:p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h1 className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">Explore calls</h1>
          <span className="text-[10px] tabular-nums text-zinc-500">
            {total} listing{total === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
          Public and VIP calls on Telegram and Discord.
        </p>

        <form className="mt-2 space-y-1.5" action="/explore" method="get">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder="Search…"
              className="min-h-0 min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none sm:py-1.5"
            />
            <div className="flex shrink-0 gap-1.5 sm:items-stretch">
              <button
                type="submit"
                className="rounded-md bg-white px-2.5 py-1 text-[10px] font-medium text-black transition hover:bg-zinc-200 sm:px-3 sm:py-1.5"
              >
                Search
              </button>
              {hasActiveFilters && (
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center rounded-md border border-white/12 px-2.5 py-1 text-center text-[10px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 sm:px-3"
                >
                  Clear
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              name="platform"
              defaultValue={platform}
              className="h-7 min-w-0 max-w-full flex-1 rounded-md border border-white/10 bg-zinc-900 px-1.5 text-[10px] text-zinc-100 focus:border-white/25 focus:outline-none sm:max-w-[7.5rem] sm:flex-none"
            >
              <option value="ALL">Platform</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="DISCORD">Discord</option>
            </select>
            <select
              name="type"
              defaultValue={type}
              className="h-7 min-w-0 max-w-full flex-1 rounded-md border border-white/10 bg-zinc-900 px-1.5 text-[10px] text-zinc-100 focus:border-white/25 focus:outline-none sm:max-w-[7.5rem] sm:flex-none"
            >
              <option value="ALL">Type</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
            <select
              name="access"
              defaultValue={access}
              className="h-7 min-w-0 max-w-full flex-1 rounded-md border border-white/10 bg-zinc-900 px-1.5 text-[10px] text-zinc-100 focus:border-white/25 focus:outline-none sm:max-w-[6.5rem] sm:flex-none"
            >
              <option value="ALL">Access</option>
              <option value="FREE">Open</option>
              <option value="PAID">VIP</option>
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="h-7 min-w-0 max-w-full flex-1 rounded-md border border-white/10 bg-zinc-900 px-1.5 text-[10px] text-zinc-100 focus:border-white/25 focus:outline-none sm:max-w-[9.5rem] sm:flex-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
            </select>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <input
                name="minPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={minPrice}
                placeholder="Min $"
                className="h-7 w-16 rounded-md border border-white/10 bg-zinc-900 px-1.5 text-[10px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none sm:w-[4.5rem]"
              />
              <input
                name="maxPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={maxPrice}
                placeholder="Max $"
                className="h-7 w-16 rounded-md border border-white/10 bg-zinc-900 px-1.5 text-[10px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none sm:w-[4.5rem]"
              />
            </div>
          </div>
        </form>
      </section>

      <section className="mt-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/60 px-4 py-6 text-center">
            <p className="text-xs text-zinc-400">No matching calls found.</p>
            <p className="mt-1 text-[10px] text-zinc-600">Try a broader search or clear filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
            {items.map((p) => {
              const platform = platformById.get(p.id) ?? { telegram: p.telegram, discord: p.discord };
              return (
                <article
                  key={p.id}
                  className="flex h-full flex-col rounded-xl border border-white/10 bg-zinc-950/70 p-2.5 transition hover:border-white/20 hover:bg-zinc-900/70"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      {p.communityImage ? (
                        <div className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/15 sm:h-11 sm:w-11">
                          <Image
                            src={p.communityImage}
                            alt=""
                            width={44}
                            height={44}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-[10px] font-semibold text-zinc-200 sm:h-11 sm:w-11 sm:text-[11px]">
                          {groupInitial(p.title)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 pt-1 sm:pt-1.5">
                        <p className="line-clamp-1 text-[11px] font-medium text-zinc-100">{p.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-500">{p.shortPitch}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                      <span className="rounded-full border border-white/10 px-1 py-0.5 text-[8px] leading-none text-zinc-400">
                        {p.accessType === "PAID" ? "VIP" : "Open"}
                      </span>
                      <div className="flex justify-end">
                        <PlatformIcons telegram={platform.telegram} discord={platform.discord} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      {p.user.image ? (
                        <Image
                          src={p.user.image}
                          alt={p.user.name || "Creator"}
                          width={20}
                          height={20}
                          className="h-5 w-5 shrink-0 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-[8px] font-semibold text-zinc-300"
                          aria-hidden
                        >
                          {userInitial(p.user.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 truncate text-[10px] text-zinc-400">
                        <XUsername
                          name={p.user.name || "Anonymous"}
                          xHandle={p.user.xHandle}
                          xUserId={p.user.accounts?.[0]?.providerAccountId}
                          className="text-zinc-200"
                        />
                        {p.user.wallet && <span className="ml-1 text-emerald-400">verified</span>}
                      </div>
                    </div>
                    <span className="shrink-0 tabular-nums text-[10px] font-medium leading-none text-zinc-200">
                      {formatListingPrice(p)}
                    </span>
                  </div>

                  <Link
                    href={`/p/${p.slug}`}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-white/15 px-2 py-1 text-[9px] text-zinc-200 transition hover:border-white/30 hover:text-white"
                  >
                    View detail
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}




