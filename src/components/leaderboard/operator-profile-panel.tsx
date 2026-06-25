import { OperatorCommunitiesTable } from "@/components/leaderboard/operator-communities-table";
import { CreatorAvatar } from "@/components/creator-avatar";
import { XUsername } from "@/components/x-username";
import { formatEscrowAmountLabel } from "@/lib/listing-price";
import type { OperatorProfile } from "@/lib/operator-profile";
import { Eye, LayoutGrid, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import Image from "next/image";

function formatViews(n: number) {
  return n.toLocaleString("en-US");
}

function shortenWallet(wallet: string) {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

type Props = {
  profile: OperatorProfile;
};

export function OperatorProfilePanel({ profile }: Props) {
  const { user, rank, totalViews, listingCount, earnings, communities } = profile;
  const displayName = user.name || "Anonymous";

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-lg border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <CreatorAvatar
              src={user.image}
              alt={displayName}
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full border border-white/10 object-cover"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  <XUsername
                    name={displayName}
                    xHandle={user.xHandle}
                    xUserId={user.accounts?.[0]?.providerAccountId}
                    className="text-white hover:text-sky-300"
                  />
                </h1>
                {user.blueCheckmark ? (
                  <Image src="/verified-badge.png" alt="Verified" width={16} height={16} className="h-4 w-4 shrink-0" />
                ) : null}
                {rank != null ? (
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-400">
                    Rank #{rank}
                  </span>
                ) : null}
              </div>
              {user.xHandle ? (
                <p className="mt-1 text-xs text-zinc-500">@{user.xHandle.replace(/^@/, "")}</p>
              ) : null}
              {user.wallet ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <Wallet className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="font-mono tabular-nums">{shortenWallet(user.wallet)}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Listings", value: listingCount, icon: LayoutGrid },
            { label: "Total views", value: formatViews(totalViews), icon: Eye },
            { label: "Sales", value: earnings.completedSales, icon: ShoppingBag },
            {
              label: "Earnings",
              value: null,
              icon: TrendingUp,
              earnings: true,
            },
          ].map(({ label, value, icon: Icon, earnings: isEarnings }) => (
            <div key={label} className="rounded-lg border border-white/8 bg-zinc-900/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                <span className="text-xs font-medium uppercase tracking-widest">{label}</span>
              </div>
              {isEarnings ? (
                <div className="mt-1 space-y-0.5 text-sm font-semibold tabular-nums text-emerald-400">
                  {earnings.solNet > 0 ? (
                    <p>{formatEscrowAmountLabel(earnings.solNet, "SOL")}</p>
                  ) : null}
                  {earnings.usdcNet > 0 ? (
                    <p>{formatEscrowAmountLabel(earnings.usdcNet, "USDC")}</p>
                  ) : null}
                  {earnings.solNet <= 0 && earnings.usdcNet <= 0 ? (
                    <p className="text-zinc-500">—</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{value}</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Earnings are net after platform fees from completed escrow sales.
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60">
        <div className="border-b border-white/10 px-3.5 py-2.5">
          <h2 className="ui-form-section-title text-sm">Communities</h2>
          <p className="text-xs text-zinc-500">
            Published listings, views, and sales revenue.
          </p>
        </div>

        {communities.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-xs text-zinc-500">No published communities yet.</p>
        ) : (
          <OperatorCommunitiesTable communities={communities} />
        )}
      </section>
    </div>
  );
}
