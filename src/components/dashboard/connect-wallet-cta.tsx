"use client";

import { WalletConnectExtras } from "@/components/solana/wallet-connect-extras";
import { useWalletConnect } from "@/hooks/use-wallet-connect";
import { useWallet } from "@solana/wallet-adapter-react";

export function ConnectWalletCta() {
  const { connected } = useWallet();
  const { connectWallet, hint, phantomOpenUrl, connecting } = useWalletConnect();

  if (connected) return null;

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => void connectWallet()}
        disabled={connecting}
        className="inline-flex min-h-9 w-fit items-center justify-center rounded-lg border border-amber-400/30 bg-amber-950/20 px-3 py-2 text-sm font-medium text-amber-200/90 transition hover:border-amber-300/50 hover:bg-amber-950/35 disabled:opacity-60"
      >
        {connecting ? "Opening wallet…" : "Connect wallet"}
      </button>
      {hint ? <p className="mt-1 max-w-md text-right text-xs text-amber-200/85">{hint}</p> : null}
      <WalletConnectExtras hint={null} phantomUrl={phantomOpenUrl} />
    </div>
  );
}
