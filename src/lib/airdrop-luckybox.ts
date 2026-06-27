import { prisma } from "@/lib/prisma";

export type LuckyBoxStatus = "READY" | "OPENED" | "CLAIMED" | "FAILED";

export type LuckyBoxState = {
  status: LuckyBoxStatus;
  amount: number | null;
  openedAt: string | null;
  claimedAt: string | null;
  txSignature: string | null;
};

export function luckyBoxFromEntry(entry: {
  rewardStatus: string;
  rewardAmount: number | null;
  openedAt: Date | null;
  claimedAt: Date | null;
  txSignature: string | null;
}): LuckyBoxState {
  const status = entry.rewardStatus as LuckyBoxStatus;
  return {
    status,
    amount: entry.rewardAmount,
    openedAt: entry.openedAt?.toISOString() ?? null,
    claimedAt: entry.claimedAt?.toISOString() ?? null,
    txSignature: entry.txSignature,
  };
}

export async function getWaitlistWithLuckyBox(userId: string) {
  return prisma.airdropWaitlist.findUnique({
    where: { userId },
    select: {
      id: true,
      wallet: true,
      createdAt: true,
      rewardStatus: true,
      rewardAmount: true,
      openedAt: true,
      claimedAt: true,
      txSignature: true,
    },
  });
}

export async function requireWaitlistEntry(userId: string) {
  const entry = await getWaitlistWithLuckyBox(userId);
  if (!entry) {
    return null;
  }
  return entry;
}
