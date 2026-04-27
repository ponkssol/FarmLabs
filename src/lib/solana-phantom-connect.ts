import {
  type WalletName,
  WalletNotReadyError,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import type { WalletContextState } from "@solana/wallet-adapter-react";

export type PhantomConnectResult =
  | { kind: "selected_phantom" }
  | { kind: "connected" }
  | { kind: "not_ready"; message: string }
  | { kind: "error"; message: string };

async function waitUntilWalletReady(
  wallet: NonNullable<WalletContextState["wallet"]>,
  maxMs: number,
) {
  const step = 100;
  for (let t = 0; t < maxMs; t += step) {
    const rs = wallet.adapter.readyState;
    if (rs === WalletReadyState.Installed || rs === WalletReadyState.Loadable) {
      return true;
    }
    if (rs === WalletReadyState.Unsupported) {
      return false;
    }
    await new Promise((r) => setTimeout(r, step));
  }
  const rs = wallet.adapter.readyState;
  return rs === WalletReadyState.Installed || rs === WalletReadyState.Loadable;
}

/**
 * Phantom connect flow (shared by dashboard and header). Avoid calling `connect()` before the adapter is ready.
 */
export async function runPhantomConnectFlow(
  ctx: Pick<WalletContextState, "wallet" | "wallets" | "select" | "connect">,
): Promise<PhantomConnectResult> {
  const { wallet, wallets, select, connect } = ctx;
  const preferred = ["Phantom", "Solflare"] as const;

  if (!wallet) {
    const target =
      wallets.find((w) => preferred.includes(w.adapter.name as (typeof preferred)[number])) ??
      wallets.find(
        (w) =>
          w.adapter.readyState === WalletReadyState.Installed ||
          w.adapter.readyState === WalletReadyState.Loadable,
      ) ??
      wallets[0];
    if (!target) {
      return {
        kind: "not_ready",
        message: "No supported wallet adapter found.",
      };
    }
    select(target.adapter.name as WalletName);
    return { kind: "selected_phantom" };
  }

  if (wallet.adapter.readyState === WalletReadyState.Unsupported) {
    return {
      kind: "not_ready",
      message:
        "Wallet is not available in this view (e.g. restricted or embedded browser).",
    };
  }

  const ready = await waitUntilWalletReady(wallet, 3000);
  if (!ready) {
    if (wallet.adapter.readyState === WalletReadyState.NotDetected) {
      return {
        kind: "not_ready",
        message:
          "Phantom not detected. Install it from https://phantom.com, then refresh the page and try again.",
      };
    }
    return {
      kind: "not_ready",
      message: "Wallet not ready yet. Wait a moment, then try again.",
    };
  }

  try {
    await connect();
    return { kind: "connected" };
  } catch (e) {
    if (e instanceof WalletNotReadyError) {
      return {
        kind: "not_ready",
        message: "Wallet not ready. Unlock Phantom, refresh the page, then try again.",
      };
    }
    return {
      kind: "error",
      message: "Failed to connect wallet. Make sure Phantom is installed and unlocked.",
    };
  }
}

export function resultToPanelMessage(
  r: PhantomConnectResult,
  messages: { selected: string } = {
    selected: "Phantom selected. Click “Connect wallet” again after a second.",
  },
): string | null {
  if (r.kind === "selected_phantom") return messages.selected;
  if (r.kind === "not_ready") return r.message;
  if (r.kind === "error") return r.message;
  return null;
}
