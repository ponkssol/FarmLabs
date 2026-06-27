import {
  type WalletName,
  WalletNotReadyError,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import {
  getPhantomInAppBrowserUrl,
  isAndroidMobileWalletSupported,
  isIOS,
  isPhantomInAppBrowser,
  SolanaMobileWalletAdapterWalletName,
} from "@/lib/mobile-wallet";

export type PhantomConnectResult =
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

function pickWallet(wallets: WalletContextState["wallets"]) {
  if (isAndroidMobileWalletSupported()) {
    return (
      wallets.find((w) => w.adapter.name === SolanaMobileWalletAdapterWalletName) ?? wallets[0]
    );
  }
  const preferred: WalletName[] = ["Phantom" as WalletName, "Solflare" as WalletName];
  return (
    wallets.find((w) => preferred.includes(w.adapter.name)) ??
    wallets.find(
      (w) =>
        w.adapter.readyState === WalletReadyState.Installed ||
        w.adapter.readyState === WalletReadyState.Loadable,
    ) ??
    wallets[0]
  );
}

function iosFallback(): PhantomConnectResult {
  return {
    kind: "open_in_phantom",
    url: getPhantomInAppBrowserUrl(),
  };
}

/**
 * One-tap wallet connect. On Android Chrome uses Mobile Wallet Adapter (opens Phantom/Solflare app directly).
 */
export async function runPhantomConnectFlow(
  ctx: Pick<WalletContextState, "wallet" | "wallets" | "select" | "connect">,
): Promise<PhantomConnectResult> {
  const { wallet, wallets, select, connect } = ctx;

  if (wallets.length === 0) {
    return { kind: "not_ready", message: "No wallet adapter available." };
  }

  const target = pickWallet(wallets);
  if (!target) {
    return { kind: "not_ready", message: "No supported wallet found." };
  }

  const usingMwa = target.adapter.name === SolanaMobileWalletAdapterWalletName;

  if (!wallet || wallet.adapter.name !== target.adapter.name) {
    select(target.adapter.name as WalletName);
  }

  const active = wallet?.adapter.name === target.adapter.name ? wallet : target;

  if (active.adapter.readyState === WalletReadyState.Unsupported) {
    if (isIOS() && !isPhantomInAppBrowser()) {
      return iosFallback();
    }
    return {
      kind: "not_ready",
      message:
        "Wallet not available in this browser. On Android use Chrome with Phantom installed. Avoid in-app browsers (Twitter, Telegram).",
      openInPhantom: isIOS(),
    };
  }

  const ready = await waitUntilWalletReady(active, usingMwa ? 1500 : 3000);
  if (!ready) {
    if (isIOS() && !isPhantomInAppBrowser()) {
      return iosFallback();
    }
    if (active.adapter.readyState === WalletReadyState.NotDetected) {
      return {
        kind: "not_ready",
        message: isAndroidMobileWalletSupported()
          ? "Install Phantom from the Play Store, then tap Connect again."
          : "Install the Phantom extension on desktop, or use Chrome on Android with Phantom installed.",
        openInPhantom: isIOS(),
      };
    }
    return { kind: "not_ready", message: "Wallet not ready yet. Try again in a moment." };
  }

  try {
    await connect();
    return { kind: "connected" };
  } catch (e) {
    if (e instanceof WalletNotReadyError) {
      if (isIOS() && !isPhantomInAppBrowser()) {
        return iosFallback();
      }
      return {
        kind: "not_ready",
        message: usingMwa
          ? "Could not open your wallet app. Make sure Phantom is installed."
          : "Wallet not ready. Unlock your wallet and try again.",
        openInPhantom: isIOS(),
      };
    }
    const msg = e instanceof Error ? e.message : "Failed to connect wallet.";
    return {
      kind: "error",
      message: usingMwa
        ? `Could not connect via mobile wallet: ${msg}`
        : msg || "Failed to connect wallet.",
      openInPhantom: isIOS(),
    };
  }
}

/** @deprecated alias */
export const runWalletConnectFlow = runPhantomConnectFlow;

export function resultToPanelMessage(r: PhantomConnectResult): string | null {
  if (r.kind === "open_in_phantom") {
    return "On iPhone, open FarmLabs inside the Phantom app to connect (Apple does not support direct wallet links from Safari).";
  }
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
