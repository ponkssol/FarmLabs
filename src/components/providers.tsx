"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { SolanaProvider } from "@/components/solana/solana-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SolanaProvider>{children}</SolanaProvider>
    </SessionProvider>
  );
}
