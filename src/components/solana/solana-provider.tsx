"use client";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { useEffect, useMemo, type ReactNode } from "react";
import { isAndroidMobileWalletSupported } from "@/lib/mobile-wallet";
import { DEFAULT_MAINNET_HTTP_RPC } from "@/lib/solana-rpc-defaults";

const WALLET_STORAGE_KEY = "walletName";

export function SolanaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const g = globalThis as unknown as { Buffer?: typeof Buffer };
    if (!g.Buffer) g.Buffer = Buffer;

    if (isAndroidMobileWalletSupported()) {
      try {
        const stored = localStorage.getItem(WALLET_STORAGE_KEY);
        if (stored === "Phantom" || stored === "Solflare") {
          localStorage.removeItem(WALLET_STORAGE_KEY);
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() || DEFAULT_MAINNET_HTTP_RPC,
    [],
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect localStorageKey={WALLET_STORAGE_KEY}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
