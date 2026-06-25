import { LeaderboardBoard, OPERATORS_PREVIEW_COUNT } from "@/components/leaderboard/leaderboard-board";
import {
  fetchAllLeaderboardOperators,
  fetchRegisteredUserCount,
} from "@/lib/leaderboard-operators";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leader Board - FarmLabs",
  description: "Top community listings by views and top operators on FarmLabs.",
};

const LISTING_LIMIT = 50;

export default async function LeaderBoardPage() {
  const [topListings, allUsers, registeredCount] = await Promise.all([
    prisma.project.findMany({
      where: { published: true },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: LISTING_LIMIT,
      include: {
        user: {
          select: {
            name: true,
            image: true,
            xHandle: true,
            blueCheckmark: true,
            accounts: {
              where: { provider: "twitter" },
              take: 1,
              select: { providerAccountId: true },
            },
          },
        },
      },
    }),
    fetchAllLeaderboardOperators(),
    fetchRegisteredUserCount(),
  ]);

  return (
    <div className="app-main-container py-6 sm:py-8">
      <header className="mb-4 sm:mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Leader Board</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Community rankings</h1>
        <p className="ui-form-hint mt-2 max-w-xl">
          Live views from published listings and operators on FarmLabs.
        </p>
      </header>

      <LeaderboardBoard
        listings={topListings}
        operators={allUsers}
        operatorsPreviewLimit={OPERATORS_PREVIEW_COUNT}
        registeredUserCount={registeredCount}
        allUsersCount={allUsers.length}
      />
    </div>
  );
}
