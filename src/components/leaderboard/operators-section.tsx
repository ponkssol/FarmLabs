import { CreatorAvatar } from "@/components/creator-avatar";
import type { LeaderboardOperator } from "@/lib/leaderboard-operators";
import { XUsername } from "@/components/x-username";
import { ArrowRight, Crown, Eye, LayoutGrid, Medal, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function formatViews(n: number) {
  return n.toLocaleString("en-US");
}

function RankChip({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/40 bg-amber-400/10">
        <Crown className="h-3.5 w-3.5 text-amber-300" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-400/30 bg-zinc-400/10">
        <Medal className="h-3.5 w-3.5 text-zinc-300" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-orange-400/35 bg-orange-400/10">
        <Medal className="h-3.5 w-3.5 text-orange-300" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center text-xs font-semibold tabular-nums text-zinc-500">
      {rank}
    </span>
  );
}

function OperatorName({ user }: { user: LeaderboardOperator["user"] }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1">
      <XUsername
        name={user.name || "Anonymous"}
        xHandle={user.xHandle}
        xUserId={user.accounts?.[0]?.providerAccountId}
        className="truncate text-xs font-medium text-zinc-200 sm:text-sm"
      />
      {user.blueCheckmark ? (
        <Image src="/verified-badge.png" alt="Verified" width={12} height={12} className="h-3 w-3 shrink-0" />
      ) : null}
    </span>
  );
}

function OperatorRow({
  row,
  rank,
  maxViews,
}: {
  row: LeaderboardOperator;
  rank: number;
  maxViews: number;
}) {
  const pct = maxViews > 0 ? Math.max(3, Math.round((row.totalViews / maxViews) * 100)) : 0;
  const top3 = rank <= 3;

  return (
    <div
      className={`grid grid-cols-[1.5rem_2rem_minmax(0,1fr)_auto] items-center gap-x-2.5 border-b border-white/5 px-3 py-2 last:border-0 sm:grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_4rem_3.5rem] sm:px-3.5 ${top3 ? "bg-white/[0.02]" : ""}`}
    >
      <div className="flex justify-center">
        <RankChip rank={rank} />
      </div>
      <CreatorAvatar
        src={row.user.image}
        alt={row.user.name || "Operator"}
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-full border border-white/10 object-cover"
      />
      <div className="min-w-0">
        <OperatorName user={row.user} />
        {row.topListing ? (
          <Link
            href={`/p/${row.topListing.slug}`}
            className="mt-0.5 block truncate text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            {row.topListing.title}
          </Link>
        ) : (
          <p className="mt-0.5 text-xs text-zinc-600">No listings</p>
        )}
        <div className="mt-1.5 hidden h-0.5 max-w-[140px] overflow-hidden rounded-full bg-white/5 sm:block">
          <div className="h-full rounded-full bg-sky-500/60" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="hidden text-right text-xs tabular-nums text-zinc-500 sm:block">
        {row.listingCount}
      </span>
      <span className="text-right text-xs font-semibold tabular-nums text-sky-400 sm:text-sm">
        {formatViews(row.totalViews)}
      </span>
    </div>
  );
}

type Props = {
  operators: LeaderboardOperator[];
  /** Main page: max rows shown (rest via View all) */
  previewLimit?: number;
  /** Total users before slice — drives View all visibility */
  fullCount?: number;
  viewAllHref?: string;
  className?: string;
};

export function OperatorsSection({
  operators,
  previewLimit,
  fullCount,
  viewAllHref = "/leaderboard/operators",
  className = "",
}: Props) {
  const total = fullCount ?? operators.length;
  const isPreview = previewLimit != null;
  const displayed = isPreview ? operators.slice(0, previewLimit) : operators;
  const maxViews = displayed[0]?.totalViews ?? operators[0]?.totalViews ?? 1;
  const showViewAll = isPreview && total > previewLimit;

  return (
    <section className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60 ${className}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-sky-400" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <h2 className="ui-form-section-title text-sm">Top operators</h2>
            <p className="truncate text-xs text-zinc-500">
              {isPreview
                ? `Showing ${displayed.length} of ${total} users`
                : `${total} users by views`}
            </p>
          </div>
        </div>
        {showViewAll ? (
          <Link
            href={viewAllHref}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-white/10 px-2.5 text-xs font-medium text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
      </div>

      {operators.length === 0 ? (
        <p className="px-3.5 py-10 text-center text-xs text-zinc-500">
          No published listings yet.
        </p>
      ) : (
        <div className="lb-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="hidden grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_4rem_3.5rem] gap-x-2.5 border-b border-white/5 px-3.5 py-2 text-xs font-medium uppercase tracking-widest text-zinc-500 sm:sticky sm:top-0 sm:z-10 sm:grid sm:bg-zinc-950/95 sm:backdrop-blur-sm">
            <span />
            <span />
            <span>Operator</span>
            <span className="text-right">Listings</span>
            <span className="text-right">Views</span>
          </div>
          <div>
            {displayed.map((row, i) => (
              <OperatorRow key={row.user.id} row={row} rank={i + 1} maxViews={maxViews} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
