"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Review = { rating: number; comment: string; createdAt: string | Date };

type Props = {
  orderId: string;
  review: Review | null;
};

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-400" aria-label={`${n} of 5`}>
      {"★".repeat(n)}
      <span className="text-zinc-600">{"☆".repeat(5 - n)}</span>
    </span>
  );
}

export function EscrowReviewForm({ orderId, review }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (review) {
    return (
      <div className="rounded-md border border-white/10 bg-zinc-950/60 p-2">
        <div className="flex items-center gap-1.5 text-[9px]">
          <Stars n={review.rating} />
          <span className="text-zinc-600">
            {new Date(review.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
          </span>
        </div>
        {review.comment?.trim() ? (
          <p className="mt-1 text-[9px] leading-relaxed text-zinc-400">{review.comment}</p>
        ) : null}
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/escrow/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Failed to send review");
        return;
      }
      setComment("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1.5 rounded-md border border-amber-500/15 bg-amber-950/10 p-2">
      <p className="text-[8px] font-medium uppercase tracking-wide text-amber-200/80 sm:text-[9px]">Leave a review</p>
      <div className="flex flex-wrap items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`rounded px-1 py-0.5 text-[9px] transition ${
              rating === n ? "bg-amber-500/20 text-amber-200" : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-pressed={rating === n}
          >
            {n}★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="min-h-[40px] w-full resize-y rounded border border-white/10 bg-zinc-950/80 px-1.5 py-1 text-[9px] text-zinc-200 placeholder:text-zinc-600 sm:text-[10px]"
        placeholder="Short feedback (optional)"
        maxLength={2000}
      />
      {err && <p className="text-[9px] text-rose-300 sm:text-[10px]">{err}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-white/90 px-2 py-0.5 text-[9px] font-medium text-black disabled:opacity-50 sm:text-[10px]"
      >
        {loading ? "…" : "Submit review"}
      </button>
    </form>
  );
}
