"use client";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { useEffect, useMemo, type ReactNode } from "react";
import { DEFAULT_MAINNET_HTTP_RPC } from "@/lib/solana-rpc-defaults";

export function SolanaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const g = globalThis as unknown as { Buffer?: typeof Buffer };
    if (!g.Buffer) g.Buffer = Buffer;
  }, []);

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() || DEFAULT_MAINNET_HTTP_RPC,
    [],
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
