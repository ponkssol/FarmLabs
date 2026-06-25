import { PrismaClient } from "@prisma/airdrop-client";

const globalForAirdropPrisma = globalThis as unknown as {
  airdropPrisma: PrismaClient | undefined;
};

export const airdropPrisma: PrismaClient =
  globalForAirdropPrisma.airdropPrisma ?? new PrismaClient();

globalForAirdropPrisma.airdropPrisma = airdropPrisma;
