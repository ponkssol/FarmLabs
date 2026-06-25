import { prisma } from "@/lib/prisma";

export type LeaderboardOperator = {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    xHandle: string | null;
    blueCheckmark: boolean;
    wallet: string | null;
    accounts: { providerAccountId: string }[];
  };
  totalViews: number;
  listingCount: number;
  topListing: { title: string; slug: string; viewCount: number } | null;
};

const userSelect = {
  id: true,
  name: true,
  image: true,
  xHandle: true,
  blueCheckmark: true,
  wallet: true,
  accounts: {
    where: { provider: "twitter" as const },
    take: 1,
    select: { providerAccountId: true },
  },
};

async function loadUsersByIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: userSelect,
  });
}

async function loadTopListingPerUser(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { title: string; slug: string; viewCount: number }>();
  const rows = await prisma.project.findMany({
    where: { published: true, userId: { in: userIds } },
    orderBy: { viewCount: "desc" },
    distinct: ["userId"],
    select: { userId: true, title: true, slug: true, viewCount: true },
  });
  return new Map(rows.map((r) => [r.userId, { title: r.title, slug: r.slug, viewCount: r.viewCount }]));
}

function buildOperatorRow(
  user: Awaited<ReturnType<typeof loadUsersByIds>>[number],
  totalViews: number,
  listingCount: number,
  topListingMap: Map<string, { title: string; slug: string; viewCount: number }>,
): LeaderboardOperator {
  const top = topListingMap.get(user.id);
  return {
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
      xHandle: user.xHandle,
      blueCheckmark: user.blueCheckmark,
      wallet: user.wallet,
      accounts: user.accounts,
    },
    totalViews,
    listingCount,
    topListing: top ?? null,
  };
}

function sortOperators(rows: LeaderboardOperator[]) {
  return rows.sort((a, b) => {
    if (b.totalViews !== a.totalViews) return b.totalViews - a.totalViews;
    if (b.listingCount !== a.listingCount) return b.listingCount - a.listingCount;
    return (a.user.name ?? "").localeCompare(b.user.name ?? "");
  });
}

/** Operators with at least one published listing — ranked by real viewCount from DB. */
export async function fetchOperatorsByListingViews(): Promise<LeaderboardOperator[]> {
  const stats = await prisma.project.groupBy({
    by: ["userId"],
    where: { published: true },
    _sum: { viewCount: true },
    _count: { _all: true },
    orderBy: { _sum: { viewCount: "desc" } },
  });

  const userIds = stats.map((s) => s.userId);
  const [users, topListingMap] = await Promise.all([
    loadUsersByIds(userIds),
    loadTopListingPerUser(userIds),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = stats
    .map((stat) => {
      const user = userMap.get(stat.userId);
      if (!user) return null;
      return buildOperatorRow(
        user,
        stat._sum.viewCount ?? 0,
        stat._count._all,
        topListingMap,
      );
    })
    .filter((row): row is LeaderboardOperator => row != null);

  return sortOperators(rows);
}

/** Every registered user — views/listings summed from published projects only. */
export async function fetchAllLeaderboardOperators(): Promise<LeaderboardOperator[]> {
  const users = await prisma.user.findMany({
    select: {
      ...userSelect,
      projects: {
        where: { published: true },
        select: { title: true, slug: true, viewCount: true },
        orderBy: { viewCount: "desc" },
      },
    },
  });

  const rows = users.map((user) => {
    const totalViews = user.projects.reduce((sum, p) => sum + p.viewCount, 0);
    const top = user.projects[0];
    const topListingMap = top
      ? new Map([[user.id, { title: top.title, slug: top.slug, viewCount: top.viewCount }]])
      : new Map<string, { title: string; slug: string; viewCount: number }>();
    return buildOperatorRow(user, totalViews, user.projects.length, topListingMap);
  });

  return sortOperators(rows);
}

export async function fetchRegisteredUserCount(): Promise<number> {
  return prisma.user.count();
}
