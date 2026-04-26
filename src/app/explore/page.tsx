import { auth } from "@/auth";
import { PlatformIcons } from "@/components/platform-icons";
import { formatListingPrice } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import {
  applyVipMaskToProject,
  fetchEscrowUnlockedProjectIds,
  resolveVipViewForProject,
} from "@/lib/viewer-listing-access";
import type { Prisma } from "@prisma/client";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Explore calls - FarmLabs",
};

type SortKey = "newest" | "oldest" | "price_asc" | "price_desc";
type PlatformKey = "ALL" | "TELEGRAM" | "DISCORD" | "X";
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
        : platform === "X"
          ? { xCommunity: { not: null } }
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
      include: { user: { select: { name: true, image: true, wallet: true } } },
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

  const groupInitial = (title: string) => title.trim().charAt(0).toUpperCase() || "C";

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
          Public and VIP calls on Telegram, Discord, and X.
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
              <option value="X">X</option>
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
          <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/70">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-[11px] sm:text-xs">
                <thead className="bg-zinc-900/90 text-zinc-500">
                  <tr className="border-b border-white/10">
                    <th className="w-[130px] px-3 py-2.5 font-medium">Profile</th>
                    <th className="w-[360px] px-3 py-2.5 font-medium">Call</th>
                    <th className="w-[100px] px-3 py-2.5 font-medium text-center">Platform</th>
                    <th className="w-[130px] px-3 py-2.5 font-medium">Type</th>
                    <th className="w-[90px] px-3 py-2.5 font-medium">Access</th>
                    <th className="w-[90px] px-3 py-2.5 font-medium">Price</th>
                    <th className="w-[180px] px-3 py-2.5 font-medium">Operator</th>
                    <th className="w-[90px] px-3 py-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.03]">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-[10px] font-semibold text-zinc-200">
                            {groupInitial(p.title)}
                          </div>
                          <span className="text-[10px] text-zinc-500">Group/Channel</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-medium text-zinc-100">{p.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{p.shortPitch}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <PlatformIcons telegram={p.telegram} discord={p.discord} xCommunity={p.xCommunity} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">{p.groupType === "PUBLIC" ? "Public call" : "Private call"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">{p.accessType === "PAID" ? "VIP" : "Open"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">
                        {formatListingPrice(p)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="text-zinc-200">{p.user.name || "Anonymous"}</span>
                        {p.user.wallet && <span className="ml-2 text-[11px] text-emerald-400">verified</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Link
                          href={`/p/${p.slug}`}
                          className="inline-flex rounded-md border border-white/15 px-2 py-1 text-[10px] text-zinc-200 transition hover:border-white/30 hover:text-white"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}




