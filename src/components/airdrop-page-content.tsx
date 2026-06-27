"use client";

import { AirdropLuckyBox } from "@/components/airdrop-lucky-box";
import { AirdropWaitlistPanel } from "@/components/airdrop-waitlist-panel";
import type { LuckyBoxState } from "@/lib/airdrop-luckybox";
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
    <div className="space-y-4">
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
      ) : null}
    </div>
  );
}
