import type { ProjectPriceOption } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

/** Reuse one client per serverless isolate (Vercel) to avoid extra connection churn. */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;

/** Access tiers for a listing (escrow / pricing). */
export function findProjectPriceOptionsByProjectId(projectId: string): Promise<ProjectPriceOption[]> {
  return prisma.projectPriceOption.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });
}
