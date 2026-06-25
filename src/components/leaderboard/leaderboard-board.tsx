import { ListingCreatorChip } from "@/components/leaderboard/listing-creator-chip";
import { OperatorsSection } from "@/components/leaderboard/operators-section";
import type { LeaderboardOperator } from "@/lib/leaderboard-operators";
import { Eye, LayoutGrid, Sparkles, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type LeaderboardListing = {
  id: string;
  slug: string;
  title: string;
  viewCount: number;
  communityImage: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    xHandle: string | null;
    blueCheckmark: boolean;
    accounts: { providerAccountId: string }[];
  };
};

export const OPERATORS_PREVIEW_COUNT = 12;

type Props = {
  listings: LeaderboardListing[];
  operators: LeaderboardOperator[];
  operatorsPreviewLimit?: number;
  listingsPreviewLimit?: number;
  registeredUserCount?: number;
  allUsersCount?: number;
};

function formatViews(n: number) {
  return n.toLocaleString("en-US");
}

function ListingsSection({ listings }: { listings: LeaderboardListing[] }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3.5 py-2.5">
        <Trophy className="h-4 w-4 text-emerald-400" strokeWidth={1.75} aria-hidden />
        <div>
          <h2 className="ui-form-section-title text-sm">Top listings</h2>
          <p className="text-xs text-zinc-500">By page views</p>
        </div>
      </div>

      {listings.length === 0 ? (
        <p className="px-3.5 py-10 text-center text-xs text-zinc-500">No published listings yet.</p>
      ) : (
        <div className="lb-scroll min-h-0 flex-1 overflow-y-auto">
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
                className="group grid grid-cols-[1.5rem_2rem_minmax(0,1fr)_auto] items-center gap-x-2.5 border-b border-white/5 px-3 py-2 transition last:border-0 hover:bg-white/[0.03] sm:grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_3.5rem] sm:px-3.5"
              >
                <span className="text-center text-xs font-semibold tabular-nums text-zinc-500 group-hover:text-zinc-300">
                  {i + 1}
                </span>
                <Link href={`/p/${listing.slug}`} className="shrink-0">
                  {listing.communityImage ? (
                    <div className="relative h-7 w-7 overflow-hidden rounded-md border border-white/10">
                      <Image
                        src={listing.communityImage}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900 text-xs font-semibold text-zinc-400">
                      {listing.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/p/${listing.slug}`}
                    className="block truncate text-xs font-medium text-zinc-200 transition hover:text-white sm:text-sm"
                  >
                    {listing.title}
                  </Link>
                  <ListingCreatorChip user={listing.user} />
                </div>
                <Link
                  href={`/p/${listing.slug}`}
                  className="flex items-center justify-end gap-1 text-xs font-semibold tabular-nums text-emerald-400 transition hover:text-emerald-300 sm:text-sm"
                >
                  <Eye className="h-3.5 w-3.5 opacity-70" strokeWidth={1.75} aria-hidden />
                  {formatViews(listing.viewCount)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function LeaderboardBoard({
  listings,
  operators,
  operatorsPreviewLimit = OPERATORS_PREVIEW_COUNT,
  listingsPreviewLimit = 15,
  registeredUserCount,
  allUsersCount,
}: Props) {
  const totalViews = operators.reduce((a, o) => a + o.totalViews, 0);
  const userTotal = allUsersCount ?? registeredUserCount ?? operators.length;
  const displayedListings = listings.slice(0, listingsPreviewLimit);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Users", value: userTotal, icon: Users },
          { label: "Listings", value: listings.length, icon: LayoutGrid },
          { label: "Views", value: formatViews(totalViews), icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              <span className="text-xs font-medium uppercase tracking-widest">{label}</span>
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="min-w-0 flex-1 sm:max-h-[min(72vh,680px)]">
          <OperatorsSection
            operators={operators}
            previewLimit={operatorsPreviewLimit}
            fullCount={userTotal}
            viewAllHref="/leaderboard/operators"
            className="h-full"
            linkToProfile
          />
        </div>
        <div className="min-w-0 flex-1 sm:max-h-[min(72vh,680px)]">
          <ListingsSection listings={displayedListings} />
        </div>
      </div>
    </div>
  );
}
