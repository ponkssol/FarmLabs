import { getPlatformFeeSol, getPlatformFeeUsdc } from "@/lib/escrow-config";
import { fetchAllLeaderboardOperators } from "@/lib/leaderboard-operators";
import { prisma } from "@/lib/prisma";

const COMPLETED_STATUSES = ["SETTLED", "RELEASED", "FUNDED"] as const;

export type OperatorCommunity = {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  accessType: string;
  groupType: string;
  communityImage: string | null;
  completedSales: number;
  solVolume: number;
  usdcVolume: number;
  solEarnings: number;
  usdcEarnings: number;
};

export type OperatorProfile = {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    xHandle: string | null;
    blueCheckmark: boolean;
    wallet: string | null;
    accounts: { providerAccountId: string }[];
  };
  rank: number | null;
  totalViews: number;
  listingCount: number;
  earnings: {
    solGross: number;
    usdcGross: number;
    solNet: number;
    usdcNet: number;
    solOrders: number;
    usdcOrders: number;
    completedSales: number;
  };
  communities: OperatorCommunity[];
};

function netAfterFees(gross: number, orderCount: number, currency: "SOL" | "USDC"): number {
  const fee = currency === "SOL" ? getPlatformFeeSol() : getPlatformFeeUsdc();
  return Math.max(0, gross - orderCount * fee);
}

export async function fetchOperatorProfile(userId: string): Promise<OperatorProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      xHandle: true,
      blueCheckmark: true,
      wallet: true,
      accounts: {
        where: { provider: "twitter" },
        take: 1,
        select: { providerAccountId: true },
      },
    },
  });
  if (!user) return null;

  const doneWhere = { sellerId: userId, status: { in: [...COMPLETED_STATUSES] } };

  const [projects, salesByProject, solAgg, usdcAgg, completedCount, allOperators] = await Promise.all([
    prisma.project.findMany({
      where: { userId, published: true },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        accessType: true,
        groupType: true,
        communityImage: true,
      },
    }),
    prisma.escrowOrder.groupBy({
      by: ["projectId", "currency"],
      where: doneWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.escrowOrder.aggregate({
      where: { ...doneWhere, currency: "SOL" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.escrowOrder.aggregate({
      where: { ...doneWhere, currency: "USDC" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.escrowOrder.count({ where: doneWhere }),
    fetchAllLeaderboardOperators(),
  ]);

  type PerProject = { sol: number; usdc: number; solOrders: number; usdcOrders: number; orders: number };
  const byProject = new Map<string, PerProject>();

  for (const row of salesByProject) {
    const cur = byProject.get(row.projectId) ?? { sol: 0, usdc: 0, solOrders: 0, usdcOrders: 0, orders: 0 };
    const amt = row._sum.amount ?? 0;
    const count = row._count._all;
    cur.orders += count;
    if (row.currency === "SOL") {
      cur.sol += amt;
      cur.solOrders += count;
    }
    if (row.currency === "USDC") {
      cur.usdc += amt;
      cur.usdcOrders += count;
    }
    byProject.set(row.projectId, cur);
  }

  const communities: OperatorCommunity[] = projects.map((p) => {
    const s = byProject.get(p.id) ?? { sol: 0, usdc: 0, solOrders: 0, usdcOrders: 0, orders: 0 };
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      viewCount: p.viewCount,
      accessType: p.accessType,
      groupType: p.groupType,
      communityImage: p.communityImage,
      completedSales: s.orders,
      solVolume: s.sol,
      usdcVolume: s.usdc,
      solEarnings: netAfterFees(s.sol, s.solOrders, "SOL"),
      usdcEarnings: netAfterFees(s.usdc, s.usdcOrders, "USDC"),
    };
  });

  const rankIndex = allOperators.findIndex((o) => o.user.id === userId);
  const totalViews = projects.reduce((sum, p) => sum + p.viewCount, 0);

  const solGross = solAgg._sum.amount ?? 0;
  const usdcGross = usdcAgg._sum.amount ?? 0;
  const solOrders = solAgg._count._all;
  const usdcOrders = usdcAgg._count._all;

  return {
    user,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    totalViews,
    listingCount: projects.length,
    earnings: {
      solGross,
      usdcGross,
      solNet: netAfterFees(solGross, solOrders, "SOL"),
      usdcNet: netAfterFees(usdcGross, usdcOrders, "USDC"),
      solOrders,
      usdcOrders,
      completedSales: completedCount,
    },
    communities,
  };
}
