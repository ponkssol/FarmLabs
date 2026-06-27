import { LeaderboardRankingsView } from "@/components/leaderboard/leaderboard-rankings-view";
import type { LeaderboardOperator } from "@/lib/leaderboard-operators";
import { LayoutGrid, Sparkles, Users } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Users", value: userTotal, icon: Users },
          { label: "Listings", value: listings.length, icon: LayoutGrid },
          { label: "Views", value: formatViews(totalViews), icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-white/10 bg-zinc-950/50 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="flex items-center gap-1 text-zinc-500 sm:gap-1.5">
              <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} aria-hidden />
              <span className="truncate text-[10px] font-medium uppercase tracking-wider sm:text-xs sm:tracking-widest">
                {label}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-white sm:mt-1 sm:text-base">{value}</p>
          </div>
        ))}
      </div>

      <LeaderboardRankingsView
        listings={listings}
        operators={operators}
        operatorsPreviewLimit={operatorsPreviewLimit}
        listingsPreviewLimit={listingsPreviewLimit}
        allUsersCount={userTotal}
      />
    </div>
  );
}
