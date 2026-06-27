"use client";

import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
} from "@solana-mobile/wallet-adapter-mobile";
import type { Adapter } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { useEffect, useMemo, type ReactNode } from "react";
import { DEFAULT_MAINNET_HTTP_RPC } from "@/lib/solana-rpc-defaults";

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.AUTH_URL?.trim() ||
  "https://www.farmlabs.space";

export function SolanaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const g = globalThis as unknown as { Buffer?: typeof Buffer };
    if (!g.Buffer) g.Buffer = Buffer;
  }, []);

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() || DEFAULT_MAINNET_HTTP_RPC,
    [],
  );

  const wallets = useMemo((): Adapter[] => {
    const list: Adapter[] = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
    if (typeof window !== "undefined") {
      list.push(
        new SolanaMobileWalletAdapter({
          appIdentity: {
            name: "FarmLabs",
            uri: APP_ORIGIN,
            icon: `${APP_ORIGIN.replace(/\/$/, "")}/favicon.jpg`,
          },
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          addressSelector: createDefaultAddressSelector(),
          chain: "solana:mainnet",
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        }),
      );
    }
    return list;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
