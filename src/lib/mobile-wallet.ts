import { SolanaMobileWalletAdapterWalletName } from "@solana-mobile/wallet-adapter-mobile";

/** Mobile Safari/Chrome — no Phantom/Solflare browser extension. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Solana Mobile Wallet Adapter — direct app-to-app connect on Android Chrome.
 * @see https://docs.solanamobile.com/solana-mobile-stack/mobile-wallet-adapter
 */
export function isAndroidMobileWalletSupported(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext && isAndroid();
}

/** True when the page runs inside Phantom's in-app browser (extension API injected). */
export function isPhantomInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { phantom?: { solana?: unknown }; solflare?: unknown };
  return Boolean(w.phantom?.solana || w.solflare);
}

export { SolanaMobileWalletAdapterWalletName };

/**
 * Opens the current page in Phantom's in-app browser (iOS fallback when MWA is unavailable).
 * @see https://docs.phantom.com/phantom-deeplinks
 */
export function getPhantomInAppBrowserUrl(pageUrl?: string): string {
  const href =
    pageUrl?.trim() ||
    (typeof window !== "undefined" ? window.location.href : "https://www.farmlabs.space");
  return `https://phantom.app/ul/browse/${encodeURIComponent(href)}`;
}

export function openPhantomInAppBrowser(pageUrl?: string): void {
  if (typeof window === "undefined") return;
  window.location.href = getPhantomInAppBrowserUrl(pageUrl);
}
