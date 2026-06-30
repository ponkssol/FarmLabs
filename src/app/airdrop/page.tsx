import { AirdropPageContent } from "@/components/airdrop-page-content";
import { AirdropPoolBalance } from "@/components/airdrop-pool-balance";
import { auth } from "@/auth";
import { getAirdropPoolTargetAmount, getAirdropTokenSymbol } from "@/lib/airdrop-config";
import { getAirdropPoolTokenBalance } from "@/lib/airdrop-solana";
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

  const tokenSymbol = getAirdropTokenSymbol();
  const poolTarget = getAirdropPoolTargetAmount();

  let poolBalance: Awaited<ReturnType<typeof getAirdropPoolTokenBalance>> | null = null;
  try {
    poolBalance = await getAirdropPoolTokenBalance();
  } catch (e) {
    console.error("[airdrop/page] pool balance", e);
  }

  return (
    <div className="app-main-container py-5 sm:py-6">
      <header className="mb-3.5 sm:mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Airdrop</p>
        <div className="mt-1 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
          <div className="min-w-0 shrink-0 lg:max-w-[300px] xl:max-w-[340px]">
            <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Waitlist &amp; rewards</h1>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
              Join with X and your wallet, then open your lucky box for {tokenSymbol} tokens.
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <AirdropPoolBalance tokenSymbol={tokenSymbol} target={poolTarget} initial={poolBalance} />
          </div>
        </div>
      </header>

      <AirdropPageContent
          isAuthenticated={Boolean(session?.user)}
          hasXAccount={hasXAccount}
          savedWallet={session?.user?.wallet ?? null}
          userId={session?.user?.id ?? null}
          tokenSymbol={tokenSymbol}
          initialJoined={Boolean(waitlistEntry)}
          initialLuckyBox={luckyBox}
          initialWallet={waitlistEntry?.wallet ?? null}
          initialCreatedAt={waitlistEntry?.createdAt.toISOString() ?? null}
      />
    </div>
  );
}
