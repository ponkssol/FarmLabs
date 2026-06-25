/**
 * Remove fake leaderboard demo users (wallet starts with "Demo").
 * Run: node --env-file=.env scripts/remove-leaderboard-demo-data.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const demoUsers = await prisma.user.findMany({
    where: { wallet: { startsWith: "Demo" } },
    select: { id: true, name: true, xHandle: true },
  });

  if (demoUsers.length === 0) {
    console.log("No demo leaderboard users found.");
    process.exit(0);
  }

  const ids = demoUsers.map((u) => u.id);
  const projects = await prisma.project.deleteMany({ where: { userId: { in: ids } } });
  const users = await prisma.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`Removed ${users.count} demo user(s) and ${projects.count} demo listing(s).`);
} finally {
  await prisma.$disconnect();
}
