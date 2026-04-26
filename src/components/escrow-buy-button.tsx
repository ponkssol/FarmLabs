"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  projectId: string;
  /** e.g. "12.50 USDC" or "0.5 SOL" — label on the button. */
  amountLabel?: string;
};

export function EscrowBuyButton({ projectId, amountLabel }: Props) {
  const router = useRouter();
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
      router.refresh();
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
        className="w-full rounded-md bg-white px-2.5 py-1.5 text-[10px] font-medium text-black disabled:opacity-60"
      >
        {loading
          ? "Processing..."
          : amountLabel
            ? `Escrow · ${amountLabel}`
            : "Buy with escrow"}
      </button>
      {message && <p className="text-[10px] text-zinc-400">{message}</p>}
    </div>
  );
}
