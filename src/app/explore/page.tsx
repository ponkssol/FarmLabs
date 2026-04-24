import { prisma } from "@/lib/prisma";
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

  const min = minPrice ? Number(minPrice) : undefined;
  const max = maxPrice ? Number(maxPrice) : undefined;

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
          priceUsd: {
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
    orderBy = [{ priceUsd: "asc" }, { createdAt: "desc" }];
  } else if (sort === "price_desc") {
    orderBy = [{ priceUsd: "desc" }, { createdAt: "desc" }];
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

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      take: 48,
      include: { user: { select: { name: true, image: true, wallet: true } } },
    }),
    prisma.project.count({ where }),
  ]);

  const platformLabel = (item: (typeof items)[number]) => {
    if (item.telegram) return "Telegram";
    if (item.discord) return "Discord";
    if (item.xCommunity) return "X Community";
    return "Unknown";
  };

  const groupInitial = (title: string) => title.trim().charAt(0).toUpperCase() || "C";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-3.5 sm:p-4.5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Explore community calls</h1>
            <p className="mt-1 text-[11px] text-zinc-500 sm:text-xs">
              Discover public calls and paid private calls from Telegram, Discord, and X Community.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] text-zinc-400">
            {total} call{total === 1 ? "" : "s"}
          </div>
        </div>

        <form className="mt-3" action="/explore" method="get">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder="Search title, niche, or call description..."
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none sm:col-span-2 lg:col-span-4"
            />
            <select
              name="platform"
              defaultValue={platform}
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-white/30 focus:outline-none"
            >
              <option value="ALL">All platforms</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="DISCORD">Discord</option>
              <option value="X">X Community</option>
            </select>
            <select
              name="type"
              defaultValue={type}
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-white/30 focus:outline-none"
            >
              <option value="ALL">All call types</option>
              <option value="PUBLIC">Public call</option>
              <option value="PRIVATE">Private call</option>
            </select>
            <select
              name="access"
              defaultValue={access}
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-white/30 focus:outline-none"
            >
              <option value="ALL">All access</option>
              <option value="FREE">Free/Open</option>
              <option value="PAID">Paid/VIP</option>
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-white/30 focus:outline-none"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="price_asc">Sort: Price low-high</option>
              <option value="price_desc">Sort: Price high-low</option>
            </select>
            <input
              name="minPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={minPrice}
              placeholder="Min price"
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
            />
            <input
              name="maxPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={maxPrice}
              placeholder="Max price"
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
            />
            <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
                className="w-full rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-zinc-200"
            >
              Search
            </button>
              {hasActiveFilters && (
              <Link
                href="/explore"
                  className="w-full rounded-lg border border-white/15 px-3 py-1.5 text-center text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Reset
              </Link>
            )}
            </div>
          </div>
        </form>
      </section>

      <section className="mt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/60 p-10 text-center">
            <p className="text-sm text-zinc-400">No matching calls found.</p>
            <p className="mt-1 text-xs text-zinc-600">Try broader keywords or clear the search filter.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-[11px] sm:text-xs">
                <thead className="bg-zinc-900/90 text-zinc-500">
                  <tr className="border-b border-white/10">
                    <th className="w-[130px] px-3 py-2.5 font-medium">Profile</th>
                    <th className="w-[360px] px-3 py-2.5 font-medium">Call</th>
                    <th className="w-[120px] px-3 py-2.5 font-medium">Platform</th>
                    <th className="w-[130px] px-3 py-2.5 font-medium">Type</th>
                    <th className="w-[120px] px-3 py-2.5 font-medium">Members</th>
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
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">{platformLabel(p)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">{p.groupType === "PUBLIC" ? "Public call" : "Private call"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">
                        {p.memberCount != null ? p.memberCount.toLocaleString("en-US") : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">{p.accessType === "PAID" ? "VIP" : "Open"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-300">
                        {p.accessType === "PAID" ? `$${p.priceUsd?.toFixed(2) ?? "0.00"}` : "Free"}
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




