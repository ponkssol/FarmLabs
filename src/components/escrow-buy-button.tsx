"use client";

import { useState } from "react";

export function EscrowBuyButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/escrow/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to purchase");
      setMessage(data.message || "Escrow purchase completed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={buy}
        disabled={loading}
        className="rounded-md bg-white px-4 py-2 text-xs font-medium text-black disabled:opacity-60"
      >
        {loading ? "Processing..." : "Buy with escrow"}
      </button>
      {message && <p className="text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
