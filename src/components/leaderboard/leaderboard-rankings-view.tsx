"use client";

import { OperatorsSection } from "@/components/leaderboard/operators-section";
import type { LeaderboardListing } from "@/components/leaderboard/leaderboard-board";
import type { LeaderboardOperator } from "@/lib/leaderboard-operators";
import { Eye, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Tab = "operators" | "listings";

type Props = {
  listings: LeaderboardListing[];
  operators: LeaderboardOperator[];
  operatorsPreviewLimit?: number;
  listingsPreviewLimit?: number;
  allUsersCount?: number;
};

function formatViews(n: number) {
  return n.toLocaleString("en-US");
}

function ListingsSection({ listings, className = "" }: { listings: LeaderboardListing[]; className?: string }) {
  return (
    <section
      className={`flex flex-col rounded-lg border border-white/10 bg-zinc-950/60 max-md:overflow-visible md:h-full md:min-h-0 md:overflow-hidden ${className}`}
    >
      <div className="hidden shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-3.5 md:flex">
        <Trophy className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <h2 className="ui-form-section-title text-sm">Top listings</h2>
          <p className="text-[11px] text-zinc-500 sm:text-xs">By page views</p>
        </div>
      </div>

      {listings.length === 0 ? (
        <p className="px-3.5 py-10 text-center text-xs text-zinc-500">No published listings yet.</p>
      ) : (
        <div className="max-md:overflow-visible md:lb-scroll md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:touch-pan-y">
          <div className="hidden grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_3.5rem] gap-x-2.5 border-b border-white/5 px-3.5 py-2 text-xs font-medium uppercase tracking-widest text-zinc-500 sm:sticky sm:top-0 sm:z-10 sm:grid sm:bg-zinc-950/95 sm:backdrop-blur-sm">
            <span>#</span>
            <span />
            <span>Listing</span>
            <span className="text-right">Views</span>
          </div>
          <div>
            {listings.map((listing, i) => (
              <div
                key={listing.id}
                className="group grid grid-cols-[1.25rem_2rem_minmax(0,1fr)_3.25rem] items-center gap-x-2 border-b border-white/5 px-2.5 py-2.5 transition last:border-0 hover:bg-white/[0.03] sm:grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_3.5rem] sm:gap-x-2.5 sm:px-3.5"
              >
                <span className="text-center text-[11px] font-semibold tabular-nums text-zinc-500 group-hover:text-zinc-300 sm:text-xs">
                  {i + 1}
                </span>
                <Link href={`/p/${listing.slug}`} className="shrink-0">
                  {listing.communityImage ? (
                    <div className="relative h-8 w-8 overflow-hidden rounded-md border border-white/10 sm:h-7 sm:w-7">
                      <Image
                        src={listing.communityImage}
                        alt=""
                        width={32}
                        height={32}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-zinc-900 text-xs font-semibold text-zinc-400 sm:h-7 sm:w-7">
                      {listing.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 overflow-hidden">
                  <Link
                    href={`/p/${listing.slug}`}
                    className="block truncate text-[13px] font-medium leading-tight text-zinc-200 transition hover:text-white sm:text-sm"
                  >
                    {listing.title}
                  </Link>
                  <Link
                    href={`/leaderboard/operators/${listing.user.id}`}
                    className="mt-0.5 hidden min-w-0 items-center gap-1 truncate text-[11px] text-zinc-500 transition hover:text-sky-300 sm:inline-flex"
                  >
                    {listing.user.name || "Anonymous"}
                  </Link>
                </div>
                <Link
                  href={`/p/${listing.slug}`}
                  className="flex flex-col items-end justify-center gap-0.5 text-right sm:flex-row sm:items-center sm:gap-1"
                >
                  <Eye className="hidden h-3.5 w-3.5 opacity-70 sm:block" strokeWidth={1.75} aria-hidden />
                  <span className="text-[11px] font-semibold tabular-nums leading-none text-emerald-400 sm:text-sm">
                    {formatViews(listing.viewCount)}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
  accent: "sky" | "emerald";
}) {
  const activeStyles =
    accent === "sky"
      ? "border-sky-500/40 bg-sky-500/10 text-white"
      : "border-emerald-500/40 bg-emerald-500/10 text-white";
  const iconActive = accent === "sky" ? "text-sky-400" : "text-emerald-400";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
        active ? activeStyles : "border-white/10 bg-zinc-900/50 text-zinc-500 hover:border-white/15 hover:text-zinc-300"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? iconActive : ""}`} strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );
}

export function LeaderboardRankingsView({
  listings,
  operators,
  operatorsPreviewLimit = 12,
  listingsPreviewLimit = 15,
  allUsersCount,
}: Props) {
  const [tab, setTab] = useState<Tab>("operators");
  const displayedListings = listings.slice(0, listingsPreviewLimit);

  return (
    <div>
      <div
        className="mb-3 grid grid-cols-2 gap-2 md:hidden"
        role="tablist"
        aria-label="Leaderboard rankings"
      >
        <TabButton
          active={tab === "operators"}
          onClick={() => setTab("operators")}
          icon={Users}
          label="Operators"
          accent="sky"
        />
        <TabButton
          active={tab === "listings"}
          onClick={() => setTab("listings")}
          icon={Trophy}
          label="Listings"
          accent="emerald"
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col max-md:max-h-none md:max-h-[min(72vh,680px)] ${tab !== "operators" ? "hidden md:flex" : ""}`}
          role="tabpanel"
        >
          <OperatorsSection
            operators={operators}
            previewLimit={operatorsPreviewLimit}
            fullCount={allUsersCount}
            viewAllHref="/leaderboard/operators"
            className="h-full max-md:max-h-none max-md:overflow-visible md:max-h-[min(calc(100dvh-16rem),640px)]"
            linkToProfile
            compactMobileHeader
          />
        </div>
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col max-md:max-h-none md:max-h-[min(72vh,680px)] ${tab !== "listings" ? "hidden md:flex" : ""}`}
          role="tabpanel"
        >
          <ListingsSection listings={displayedListings} className="md:h-full" />
        </div>
      </div>
    </div>
  );
}