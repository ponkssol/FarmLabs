"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * One-click: fill `User.xHandle` from the X OAuth token stored on the Account row.
 */
export function SyncXHandleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSync() {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/me/x-handle", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(typeof j.error === "string" ? j.error : "Could not sync");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm leading-snug text-amber-200/85">
        If your name on Explore doesn’t open your X profile, sync your handle once (uses your current X login).
      </p>
      <button
        type="button"
        onClick={() => void onSync()}
        disabled={loading}
        className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2.5 py-1.5 text-sm font-medium text-amber-100/90 transition hover:border-amber-500/50 disabled:opacity-50"
      >
        {loading ? "Syncing…" : "Link X profile for cards"}
      </button>
      {error ? <p className="text-sm text-rose-300/90">{error}</p> : null}
    </div>
  );
}
