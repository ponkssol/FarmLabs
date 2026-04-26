import type { ProjectPriceOption } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Access tiers for a listing (escrow / pricing). */
export function findProjectPriceOptionsByProjectId(projectId: string): Promise<ProjectPriceOption[]> {
  return prisma.projectPriceOption.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });
}
