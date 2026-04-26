import type { ReactNode } from "react";
import Image from "next/image";
import { XUsername } from "@/components/x-username";

export type CommunityReviewItem = {
  id: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
  createdAt: string;
  sellerReply: string;
  sellerRepliedAt: string | null;
  buyer: {
    name: string | null;
    image: string | null;
    xHandle: string | null;
    xUserId: string | null;
  };
  operator: {
    name: string | null;
    image: string | null;
    xHandle: string | null;
    xUserId: string | null;
  };
};

type Props = {
  items: CommunityReviewItem[];
  /** Average 1–5, or 0 if none */
  averageRating: number;
  count: number;
  /** Sits inside listing tab panel — no outer card chrome or duplicate "Reviews" heading */
  embedInTabs?: boolean;
};

function StarRow({ n }: { n: number }) {
  return (
    <span className="text-amber-400" aria-label={`${n} of 5`}>
      {"★".repeat(n)}
      <span className="text-zinc-600">{"☆".repeat(5 - n)}</span>
    </span>
  );
}

function ReviewListItem({ r, small }: { r: CommunityReviewItem; small?: boolean }) {
  const tName = small ? "text-xs font-medium text-zinc-200" : "text-sm font-medium text-zinc-200";
  const tTime = small ? "text-[10px] text-zinc-500" : "text-xs text-zinc-500";
  const tComment = small
    ? "mt-1 text-[11px] leading-relaxed text-zinc-300 sm:text-xs"
    : "mt-1.5 text-sm leading-relaxed text-zinc-300 sm:text-sm";
  const av = small ? "h-6 w-6" : "h-8 w-8";
  const avSm = small ? 24 : 32;
  return (
    <li className={`px-0 first:pt-0 ${small ? "py-2.5 sm:py-3" : "py-3 sm:py-3.5"}`}>
      <div className="flex items-start gap-2 sm:gap-2.5">
        {r.buyer.image ? (
          <Image
            src={r.buyer.image}
            width={avSm}
            height={avSm}
            className={`${av} shrink-0 rounded-full border border-white/10 object-cover`}
            alt=""
          />
        ) : (
          <div className={`${av} shrink-0 rounded-full border border-white/10 bg-zinc-800`} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <p className={tName}>
              <XUsername
                name={r.buyer.name || "Buyer"}
                xHandle={r.buyer.xHandle}
                xUserId={r.buyer.xUserId}
              />
            </p>
            <time
              className={`shrink-0 ${tTime}`}
              dateTime={r.createdAt}
              suppressHydrationWarning
            >
              {new Date(r.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          </div>
          <div className={`${small ? "mt-0.5 text-xs" : "mt-0.5"}`}>
            <StarRow n={r.rating} />
          </div>
          {r.comment?.trim() ? <p className={tComment}>{r.comment}</p> : null}
          {r.imageUrl ? (
            <div
              className={`relative overflow-hidden rounded-md border border-white/10 ${
                small ? "mt-1.5 max-w-[180px] sm:max-w-[200px]" : "mt-2 max-w-[220px] sm:max-w-xs"
              }`}
            >
              <Image
                src={r.imageUrl}
                width={400}
                height={300}
                unoptimized
                className={`w-full object-cover ${small ? "h-auto max-h-36" : "h-auto max-h-48"}`}
                alt="Review"
              />
            </div>
          ) : null}

          {r.sellerReply?.trim() && r.sellerRepliedAt ? (
            <div
              className={`mt-2 border-l-2 border-emerald-500/35 bg-zinc-900/50 pr-1 pl-2.5 ${
                small ? "py-1.5" : "py-2 pl-3"
              }`}
            >
              <p
                className={
                  small
                    ? "text-[9px] font-medium uppercase tracking-wide text-emerald-200/80"
                    : "text-xs font-medium uppercase tracking-wide text-emerald-200/80"
                }
              >
                Operator reply
              </p>
              <div className="mt-1 flex items-start gap-1.5 sm:gap-2">
                {r.operator.image ? (
                  <Image
                    src={r.operator.image}
                    width={small ? 20 : 24}
                    height={small ? 20 : 24}
                    className={`${small ? "h-5 w-5" : "h-6 w-6"} shrink-0 rounded-full border border-white/10 object-cover`}
                    alt=""
                  />
                ) : (
                  <div
                    className={`${small ? "h-5 w-5" : "h-6 w-6"} shrink-0 rounded-full border border-white/10 bg-zinc-800`}
                  />
                )}
                <div className="min-w-0">
                  <p className={small ? "text-xs text-zinc-200" : "text-sm text-zinc-200"}>
                    <XUsername
                      name={r.operator.name || "Operator"}
                      xHandle={r.operator.xHandle}
                      xUserId={r.operator.xUserId}
                    />
                  </p>
                  <p
                    className={
                      small
                        ? "mt-0.5 text-[11px] leading-relaxed text-zinc-300 sm:text-xs"
                        : "mt-1 text-sm leading-relaxed text-zinc-300 sm:text-sm"
                    }
                  >
                    {r.sellerReply}
                  </p>
                  <time
                    className={`mt-0.5 block ${tTime}`}
                    dateTime={r.sellerRepliedAt}
                    suppressHydrationWarning
                  >
                    {new Date(r.sellerRepliedAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function CommunityReviewsSection({ items, averageRating, count, embedInTabs = false }: Props) {
  if (count === 0) {
    const empty = (
      <p
        className={
          embedInTabs
            ? "text-[10px] leading-relaxed text-zinc-500 sm:text-[11px]"
            : "px-4 py-4 text-sm leading-relaxed text-zinc-500 sm:px-5 sm:py-4.5"
        }
      >
        No reviews yet. After escrow completes, buyers can leave a rating and note from the dashboard.
      </p>
    );
    if (embedInTabs) {
      return (
        <div className="shrink-0" aria-label="Community reviews">
          {empty}
        </div>
      );
    }
    return (
      <section
        className="shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/35"
        aria-label="Community reviews"
      >
        <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-200">Reviews</h2>
        </div>
        {empty}
      </section>
    );
  }

  const helpLine = (compact: boolean) => (
    <p
      className={
        compact
          ? "mt-1 text-[9px] leading-relaxed text-zinc-600 sm:text-[10px]"
          : "mt-1.5 text-[10px] leading-relaxed text-zinc-600 sm:text-xs"
      }
    >
      From buyers who completed escrow checkout (verified). Operators can reply to reviews from the dashboard.
    </p>
  );

  const ratingRow = (compact: boolean) => (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? "text-[10px] text-zinc-400 sm:text-[11px]" : "text-sm text-zinc-400 sm:text-sm"
      }`}
    >
      <StarRow n={Math.round(averageRating)} />
      <span>
        <span className="font-medium text-zinc-200">{averageRating.toFixed(1)}</span>
        <span className="text-zinc-600"> /5</span>
        <span className="ml-1 text-zinc-500">
          · {count} {count === 1 ? "review" : "reviews"}
        </span>
      </span>
    </div>
  );

  const list = (small: boolean) => (
    <ul className="divide-y divide-white/5" aria-label="Review list">
      {items.map((r) => (
        <ReviewListItem key={r.id} r={r} small={small} />
      ))}
    </ul>
  );

  if (embedInTabs) {
    const body: ReactNode = (
      <>
        <div className="mb-2.5 border-b border-white/[0.06] pb-2.5">
          {ratingRow(true)}
          {helpLine(true)}
        </div>
        {list(true)}
      </>
    );
    return (
      <div className="shrink-0" aria-label="Community reviews">
        {body}
      </div>
    );
  }

  return (
    <section
      className="shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/35"
      aria-label="Community reviews"
    >
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Reviews</h2>
          {ratingRow(false)}
        </div>
        {helpLine(false)}
      </div>
      {list(false)}
    </section>
  );
}
