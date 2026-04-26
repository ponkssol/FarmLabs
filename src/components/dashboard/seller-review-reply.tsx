"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  orderId: string;
  initialReply: string;
  initialRepliedAt: string | Date | null;
  /** Match table / compact dashboard rows */
  compact?: boolean;
};

export function SellerReviewReply({ orderId, initialReply, initialRepliedAt, compact = false }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialReply);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const savedOnServer = (initialReply || "").trim().length > 0;
  const repliedAt =
    initialRepliedAt == null
      ? null
      : typeof initialRepliedAt === "string"
        ? new Date(initialRepliedAt)
        : initialRepliedAt;

  useEffect(() => {
    setText(initialReply);
  }, [initialReply]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/escrow/orders/${orderId}/review/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Failed to update reply");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const c = compact;
  return (
    <form
      onSubmit={onSubmit}
      className={c ? "mt-0 rounded border border-white/8 bg-zinc-950/40 p-2" : "mt-2 rounded-md border border-white/8 bg-zinc-950/40 p-2.5"}
    >
      <p
        className={
          c
            ? "text-xs font-medium uppercase tracking-wide text-zinc-500"
            : "text-xs font-medium uppercase tracking-wide text-zinc-500 sm:text-xs"
        }
      >
        Your reply
      </p>
      {repliedAt && savedOnServer && (
        <p className={c ? "mb-0.5 text-xs text-zinc-600" : "mb-1 text-xs text-zinc-600"}>
          Last:{" "}
          {repliedAt.toLocaleString("en-US", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={
          c
            ? "min-h-[44px] w-full resize-y rounded border border-white/10 bg-zinc-950/80 px-2 py-1 text-sm text-zinc-200 placeholder:text-zinc-600"
            : "min-h-[52px] w-full resize-y rounded border border-white/10 bg-zinc-950/80 px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 sm:min-h-[64px] sm:text-sm"
        }
        placeholder="Thanks for the review — public reply to this buyer (optional)"
        maxLength={2000}
        disabled={loading}
      />
      {err && <p className={c ? "mt-0.5 text-sm text-rose-300" : "mt-1 text-xs text-rose-300 sm:text-sm"}>{err}</p>}
      <button
        type="submit"
        disabled={loading}
        className={
          c
            ? "mt-1 rounded border border-white/12 bg-white/5 px-2 py-1 text-sm text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
            : "mt-1.5 rounded border border-white/12 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 transition hover:bg-white/10 disabled:opacity-50 sm:text-sm"
        }
      >
        {loading ? "…" : savedOnServer ? "Update reply" : "Post reply"}
      </button>
    </form>
  );
}
