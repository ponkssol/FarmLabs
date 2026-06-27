import { AirdropPageContent } from "@/components/airdrop-page-content";
import { auth } from "@/auth";
import { getAirdropTokenSymbol } from "@/lib/airdrop-config";
import { luckyBoxFromEntry } from "@/lib/airdrop-luckybox";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Airdrop - FarmLabs",
  description: "Join the FarmLabs airdrop waitlist and open your lucky box.",
};

export default async function AirdropPage() {
  const session = await auth();

  let hasXAccount = false;
  let waitlistEntry: {
    wallet: string;
    createdAt: Date;
    rewardStatus: string;
    rewardAmount: number | null;
    openedAt: Date | null;
    claimedAt: Date | null;
    txSignature: string | null;
  } | null = null;

  if (session?.user?.id) {
    const [account, entry] = await Promise.all([
      prisma.account.findFirst({
        where: { userId: session.user.id, provider: "twitter" },
        select: { id: true },
      }),
      prisma.airdropWaitlist.findUnique({
        where: { userId: session.user.id },
        select: {
          wallet: true,
          createdAt: true,
          rewardStatus: true,
          rewardAmount: true,
          openedAt: true,
          claimedAt: true,
          txSignature: true,
        },
      }),
    ]);
    hasXAccount = Boolean(account);
    waitlistEntry = entry;
  }

  const luckyBox = waitlistEntry
    ? luckyBoxFromEntry(waitlistEntry)
    : {
        status: "READY" as const,
        amount: null,
        openedAt: null,
        claimedAt: null,
        txSignature: null,
      };

  return (
    <div className="app-main-container py-8 sm:py-10">
      <div className="mx-auto max-w-lg">
        <AirdropPageContent
          isAuthenticated={Boolean(session?.user)}
          hasXAccount={hasXAccount}
          savedWallet={session?.user?.wallet ?? null}
          userId={session?.user?.id ?? null}
          tokenSymbol={getAirdropTokenSymbol()}
          initialJoined={Boolean(waitlistEntry)}
          initialLuckyBox={luckyBox}
          initialWallet={waitlistEntry?.wallet ?? null}
          initialCreatedAt={waitlistEntry?.createdAt.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
