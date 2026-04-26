"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Review = {
  rating: number;
  comment: string;
  createdAt: string | Date;
  imageUrl: string | null;
  sellerReply: string;
  sellerRepliedAt: string | Date | null;
};

type Props = {
  orderId: string;
  review: Review | null;
  /** Shown with operator reply (buyer view) */
  operatorName?: string | null;
  /** Tighter type scale for table rows */
  compact?: boolean;
};

function Stars({ n, small }: { n: number; small?: boolean }) {
  return (
    <span
      className={small ? "text-xs text-amber-400" : "text-sm text-amber-400 sm:text-base"}
      aria-label={`${n} of 5`}
    >
      {"★".repeat(n)}
      <span className="text-zinc-600">{"☆".repeat(5 - n)}</span>
    </span>
  );
}

export function EscrowReviewForm({ orderId, review, operatorName, compact = false }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  if (review) {
    const opReply = review.sellerReply?.trim();
    const repliedAt =
      review.sellerRepliedAt == null
        ? null
        : new Date(
            typeof review.sellerRepliedAt === "string" ? review.sellerRepliedAt : review.sellerRepliedAt,
          );
    return (
      <div className={compact ? "space-y-1" : "space-y-1.5"}>
        <div
          className={
            compact
              ? "rounded border border-white/8 bg-zinc-950/50 px-2 py-1.5"
              : "rounded-md border border-white/8 bg-zinc-950/40 px-3 py-2"
          }
        >
          <div
            className={
              compact
                ? "flex flex-wrap items-center justify-between gap-1 text-sm"
                : "flex flex-wrap items-center justify-between gap-1.5 text-xs sm:text-sm"
            }
          >
            <div className="flex items-center gap-1.5">
              <Stars n={review.rating} small={compact} />
              <span className="text-zinc-500">
                {new Date(review.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
              </span>
            </div>
            <span className={compact ? "text-sm font-medium text-zinc-500" : "text-xs font-medium text-zinc-500 sm:text-sm"}>
              Your review
            </span>
          </div>
          {review.comment?.trim() ? (
            <p
              className={
                compact
                  ? "mt-1 text-sm leading-relaxed text-zinc-400"
                  : "mt-1.5 text-sm leading-relaxed text-zinc-300"
              }
            >
              {review.comment}
            </p>
          ) : null}
          {review.imageUrl ? (
            <div
              className={
                compact
                  ? "relative mt-1 max-w-[120px] overflow-hidden rounded border border-white/10"
                  : "relative mt-1.5 max-w-[180px] overflow-hidden rounded border border-white/10"
              }
            >
              <Image
                src={review.imageUrl}
                width={180}
                height={120}
                unoptimized
                className="h-auto max-h-24 w-full object-cover"
                alt="Review"
              />
            </div>
          ) : null}
        </div>
        {opReply && repliedAt ? (
          <div
            className={
              compact
                ? "rounded border border-emerald-500/15 bg-emerald-950/12 px-2 py-1.5"
                : "rounded-md border border-emerald-500/15 bg-emerald-950/12 px-3 py-2"
            }
          >
            <p
              className={
                compact
                  ? "text-xs font-medium uppercase tracking-wide text-emerald-200/90"
                  : "text-xs font-medium uppercase tracking-wide text-emerald-200/90 sm:text-sm sm:tracking-wider"
              }
            >
              {operatorName ? `${operatorName} (operator)` : "Operator reply"}
            </p>
            <p
              className={
                compact ? "mt-0.5 text-sm leading-relaxed text-zinc-300" : "mt-1.5 text-sm leading-relaxed text-zinc-200"
              }
            >
              {opReply}
            </p>
            <p className={compact ? "mt-0.5 text-sm text-zinc-500" : "mt-1 text-xs text-zinc-500"}>
              {repliedAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  function clearPhoto() {
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    let imageUrl: string | null = null;
    const file = fileRef.current?.files?.[0];
    try {
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("orderId", orderId);
        const up = await fetch("/api/upload/review", { method: "POST", body: fd });
        const uj = (await up.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!up.ok) {
          setErr(typeof uj.error === "string" ? uj.error : "Image upload failed");
          return;
        }
        if (uj.url) imageUrl = uj.url;
      }

      const res = await fetch(`/api/escrow/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          imageUrl: imageUrl ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Failed to send review");
        return;
      }
      setComment("");
      clearPhoto();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const c = compact;
  return (
    <details
      className={
        c
          ? "rounded border border-white/6 bg-zinc-950/30 open:border-amber-500/20 open:bg-amber-950/8"
          : "rounded-md border border-white/6 bg-zinc-950/30 open:border-amber-500/18 open:bg-amber-950/8"
      }
    >
      <summary
        className={
          c
            ? "flex cursor-pointer list-none items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden"
            : "flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden sm:min-h-0"
        }
      >
        <span>
          <span className="font-medium text-zinc-200">Rate this purchase</span>
          <span className="ml-1 text-zinc-500">· optional</span>
        </span>
        <span className={c ? "text-sm text-zinc-500" : "text-sm text-zinc-500"} aria-hidden>
          ▼
        </span>
      </summary>
      <form
        onSubmit={onSubmit}
        className={c ? "space-y-1.5 border-t border-white/6 px-2 pb-2 pt-1.5" : "space-y-2 border-t border-white/6 px-3 pb-3 pt-2"}
      >
        <div className="flex flex-wrap items-center gap-0.5" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={
                c
                  ? `rounded px-1.5 py-0.5 text-sm font-medium ${
                      rating === n ? "bg-amber-500/20 text-amber-200" : "text-zinc-500 hover:text-zinc-300"
                    }`
                  : `min-h-9 min-w-9 rounded px-2 text-xs font-medium transition sm:min-h-0 sm:min-w-0 sm:py-1.5 ${
                      rating === n ? "bg-amber-500/20 text-amber-200" : "text-zinc-500 hover:text-zinc-300"
                    }`
              }
              aria-pressed={rating === n}
            >
              {n}★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={
            c
              ? "min-h-[52px] w-full resize-y rounded border border-white/8 bg-zinc-950/90 px-2 py-1 text-sm text-zinc-200 placeholder:text-zinc-600"
              : "min-h-[88px] w-full resize-y rounded border border-white/8 bg-zinc-950/90 px-2.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 sm:min-h-[80px]"
          }
          placeholder="Short feedback (optional)"
          maxLength={2000}
        />
        <div className={c ? "space-y-0.5" : "space-y-1"}>
          <label className={c ? "block text-sm text-zinc-500" : "block text-xs text-zinc-500"}>Photo (optional, max 2MB)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={() => {
              const f = fileRef.current?.files?.[0];
              if (f) setPhotoPreview(URL.createObjectURL(f));
              else setPhotoPreview(null);
            }}
            className={
              c
                ? "w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-1.5 file:py-1 file:text-sm file:text-zinc-200"
                : "w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1.5 file:text-sm file:font-medium file:text-zinc-200"
            }
          />
          {photoPreview ? (
            <div className={c ? "relative inline-block max-w-[100px]" : "relative inline-block max-w-[140px]"}>
              <Image
                src={photoPreview}
                width={140}
                height={100}
                unoptimized
                className="rounded border border-white/10 object-cover"
                alt="Preview"
              />
              <button
                type="button"
                onClick={clearPhoto}
                className={
                  c
                    ? "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-200"
                    : "absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-200"
                }
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
        {err && <p className={c ? "text-sm text-rose-300" : "text-sm text-rose-300"}>{err}</p>}
        <div className="pt-0.5">
          <button
            type="submit"
            disabled={loading}
            className={
              c
                ? "rounded bg-white/90 px-2.5 py-1 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:opacity-50"
                : "min-h-9 rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:opacity-50"
            }
          >
            {loading ? "…" : "Submit review"}
          </button>
        </div>
      </form>
    </details>
  );
}
