"use client";

import { resultToPanelMessage, runPhantomConnectFlow } from "@/lib/solana-phantom-connect";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

export function ConnectWalletCta() {
  const { connected, connect, connecting, wallet, wallets, select } = useWallet();
  const [hint, setHint] = useState<string | null>(null);

  async function onConnect() {
    setHint(null);
    const result = await runPhantomConnectFlow({ wallet, wallets, select, connect });
    if (result.kind !== "connected") {
      setHint(
        resultToPanelMessage(result, {
          selected: "Phantom selected. Click connect once more.",
        }) ?? "Failed to connect wallet.",
      );
    }
  }

  if (connected) return null;

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => void onConnect()}
        disabled={connecting}
        className="inline-flex min-h-9 w-fit items-center justify-center rounded-lg border border-amber-400/30 bg-amber-950/20 px-3 py-2 text-sm font-medium text-amber-200/90 transition hover:border-amber-300/50 hover:bg-amber-950/35 disabled:opacity-60"
      >
        {connecting ? "Connecting..." : "Connect wallet"}
      </button>
      {hint ? <p className="mt-1 max-w-md text-right text-xs text-amber-200/85">{hint}</p> : null}
    </div>
  );
}

