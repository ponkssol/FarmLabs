import {
  type WalletName,
  WalletNotReadyError,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import {
  getPhantomInAppBrowserUrl,
  isMobileBrowser,
  isPhantomInAppBrowser,
} from "@/lib/mobile-wallet";
import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile";

export type PhantomConnectResult =
  | { kind: "selected_phantom" }
  | { kind: "connected" }
  | { kind: "not_ready"; message: string; openInPhantom?: boolean }
  | { kind: "open_in_phantom"; url: string }
  | { kind: "error"; message: string; openInPhantom?: boolean };

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
  const preferred: WalletName[] = isMobileBrowser()
    ? [SolanaMobileWalletAdapterWalletName, "Phantom" as WalletName, "Solflare" as WalletName]
    : ["Phantom" as WalletName, "Solflare" as WalletName];

  if (!wallet) {
    const target =
      wallets.find((w) => preferred.includes(w.adapter.name)) ??
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
    if (isMobileBrowser() && !isPhantomInAppBrowser()) {
      return {
        kind: "open_in_phantom",
        url: getPhantomInAppBrowserUrl(),
      };
    }
    return {
      kind: "not_ready",
      message:
        "Wallet is not available in this browser (e.g. in-app Twitter or Telegram). Open farmlabs.space in Safari or Chrome, or use Phantom's in-app browser.",
      openInPhantom: isMobileBrowser(),
    };
  }

  const ready = await waitUntilWalletReady(wallet, 3000);
  if (!ready) {
    if (wallet.adapter.readyState === WalletReadyState.NotDetected) {
      if (isMobileBrowser() && !isPhantomInAppBrowser()) {
        return {
          kind: "open_in_phantom",
          url: getPhantomInAppBrowserUrl(),
        };
      }
      return {
        kind: "not_ready",
        message:
          "Phantom not detected. On desktop, install the extension from phantom.com. On mobile, open this site in the Phantom app.",
        openInPhantom: isMobileBrowser(),
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
  if (r.kind === "open_in_phantom") {
    return "On mobile, connect works inside the Phantom app. Tap “Open in Phantom” below.";
  }
  if (r.kind === "selected_phantom") return messages.selected;
  if (r.kind === "not_ready") return r.message;
  if (r.kind === "error") return r.message;
  return null;
}

export function shouldShowOpenInPhantom(r: PhantomConnectResult): string | null {
  if (r.kind === "open_in_phantom") return r.url;
  if ((r.kind === "not_ready" || r.kind === "error") && r.openInPhantom) {
    return getPhantomInAppBrowserUrl();
  }
  return null;
}
