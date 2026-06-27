import { AirdropWaitlistPanel } from "@/components/airdrop-waitlist-panel";
import { auth } from "@/auth";
import { getAirdropTokenSymbol } from "@/lib/airdrop-config";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Airdrop - FarmLabs",
  description: "Join the FarmLabs airdrop waitlist.",
};

export default async function AirdropPage() {
  const session = await auth();

  let hasXAccount = false;
  if (session?.user?.id) {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "twitter" },
      select: { id: true },
    });
    hasXAccount = Boolean(account);
  }

  return (
    <div className="app-main-container py-8 sm:py-10">
      <div className="mx-auto max-w-lg">
        <AirdropWaitlistPanel
          isAuthenticated={Boolean(session?.user)}
          hasXAccount={hasXAccount}
          savedWallet={session?.user?.wallet ?? null}
          userId={session?.user?.id ?? null}
          tokenSymbol={getAirdropTokenSymbol()}
        />
      </div>
    </div>
  );
}
