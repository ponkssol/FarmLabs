"use client";

import { AirdropLuckyBox } from "@/components/airdrop-lucky-box";
import { AirdropPanelCard } from "@/components/airdrop-panel-card";
import { AirdropWaitlistPanel } from "@/components/airdrop-waitlist-panel";
import type { LuckyBoxState } from "@/lib/airdrop-luckybox";
import { Gift } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  isAuthenticated: boolean;
  hasXAccount: boolean;
  savedWallet: string | null;
  userId: string | null;
  tokenSymbol: string;
  initialJoined: boolean;
  initialLuckyBox: LuckyBoxState;
  initialWallet: string | null;
  initialCreatedAt: string | null;
};

function LuckyBoxLocked({ tokenSymbol }: { tokenSymbol: string }) {
  return (
    <AirdropPanelCard
      icon={Gift}
      accent="neutral"
      eyebrow="Lucky box"
      title="Locked"
      description={`Join the waitlist to unlock your ${tokenSymbol} reward.`}
      muted
      bodyClassName="items-center justify-center text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60">
        <Gift className="h-9 w-9 text-zinc-600" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="mt-4 max-w-[240px] text-xs leading-relaxed text-zinc-500 sm:text-sm">
        Complete waitlist signup on the left, then open your lucky box here.
      </p>
    </AirdropPanelCard>
  );
}

export function AirdropPageContent({
  isAuthenticated,
  hasXAccount,
  savedWallet,
  userId,
  tokenSymbol,
  initialJoined,
  initialLuckyBox,
  initialWallet,
  initialCreatedAt,
}: Props) {
  const [joined, setJoined] = useState(initialJoined);
  const [luckyBox, setLuckyBox] = useState(initialLuckyBox);
  const [wallet, setWallet] = useState(initialWallet);
  const [createdAt, setCreatedAt] = useState(initialCreatedAt);

  const handleJoined = useCallback(
    (entry: { wallet: string; createdAt: string; luckyBox: LuckyBoxState }) => {
      setJoined(true);
      setWallet(entry.wallet);
      setCreatedAt(entry.createdAt);
      setLuckyBox(entry.luckyBox);
    },
    [],
  );

  return (
    <div className="grid gap-3.5 lg:grid-cols-2 lg:items-stretch lg:gap-4">
      <AirdropWaitlistPanel
        isAuthenticated={isAuthenticated}
        hasXAccount={hasXAccount}
        savedWallet={savedWallet}
        userId={userId}
        tokenSymbol={tokenSymbol}
        joined={joined}
        wallet={wallet}
        createdAt={createdAt}
        onJoined={handleJoined}
      />

      {joined ? (
        <AirdropLuckyBox luckyBox={luckyBox} tokenSymbol={tokenSymbol} onLuckyBoxChange={setLuckyBox} />
      ) : (
        <div className="hidden lg:block">
          <LuckyBoxLocked tokenSymbol={tokenSymbol} />
        </div>
      )}
    </div>
  );
}
