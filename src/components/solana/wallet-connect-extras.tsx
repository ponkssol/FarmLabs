"use client";

import { openPhantomInAppBrowser } from "@/lib/mobile-wallet";

type Props = {
  hint: string | null;
  phantomUrl: string | null;
  align?: "left" | "right";
};

export function WalletConnectExtras({ hint, phantomUrl, align = "right" }: Props) {
  if (!hint && !phantomUrl) return null;

  return (
    <div className={`mt-1 max-w-[220px] sm:max-w-xs ${align === "left" ? "text-left" : "text-right"}`}>
      {hint ? <p className="text-[11px] leading-snug text-amber-200/85 sm:text-xs">{hint}</p> : null}
      {phantomUrl ? (
        <button
          type="button"
          onClick={() => openPhantomInAppBrowser()}
          className="mt-1 text-[11px] font-medium text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:text-sky-300 sm:text-xs"
        >
          Open in Phantom (iOS)
        </button>
      ) : null}
    </div>
  );
}
