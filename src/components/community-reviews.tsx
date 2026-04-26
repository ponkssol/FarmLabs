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
};

function StarRow({ n }: { n: number }) {
  return (
    <span className="text-amber-400" aria-label={`${n} of 5`}>
      {"★".repeat(n)}
      <span className="text-zinc-600">{"☆".repeat(5 - n)}</span>
    </span>
  );
}

export function CommunityReviewsSection({ items, averageRating, count }: Props) {
  if (count === 0) {
    return (
      <section
        className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90"
        aria-label="Community reviews"
      >
        <div className="border-b border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Buyer reviews</h2>
        </div>
        <p className="px-3.5 py-4 text-[11px] leading-relaxed text-zinc-500 sm:px-4 sm:py-4.5 sm:text-xs">
          No reviews yet. After escrow completes, buyers can leave a rating and note from the dashboard.
        </p>
      </section>
    );
  }

  return (
    <section
      className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90"
      aria-label="Community reviews"
    >
      <div className="border-b border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Buyer reviews</h2>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 sm:text-[11px]">
            <StarRow n={Math.round(averageRating)} />
            <span>
              <span className="font-medium text-zinc-200">{averageRating.toFixed(1)}</span>
              <span className="text-zinc-600"> /5</span>
              <span className="ml-1 text-zinc-500">
                · {count} {count === 1 ? "review" : "reviews"}
              </span>
            </span>
          </div>
        </div>
        <p className="mt-1 text-[8px] leading-relaxed text-zinc-600 sm:text-[9px]">
          From buyers who completed escrow checkout (verified). Operators can reply to reviews from the dashboard.
        </p>
      </div>
      <ul className="divide-y divide-white/5">
        {items.map((r) => (
          <li key={r.id} className="px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div className="flex items-start gap-2.5">
              {r.buyer.image ? (
                <Image
                  src={r.buyer.image}
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
                  alt=""
                />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                  <p className="text-[11px] font-medium text-zinc-200">
                    <XUsername
                      name={r.buyer.name || "Buyer"}
                      xHandle={r.buyer.xHandle}
                      xUserId={r.buyer.xUserId}
                    />
                  </p>
                  <time
                    className="shrink-0 text-[9px] text-zinc-500"
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
                <div className="mt-0.5">
                  <StarRow n={r.rating} />
                </div>
                {r.comment?.trim() ? (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-300 sm:text-[11px]">{r.comment}</p>
                ) : null}
                {r.imageUrl ? (
                  <div className="relative mt-2 max-w-[220px] overflow-hidden rounded-md border border-white/10 sm:max-w-xs">
                    <Image
                      src={r.imageUrl}
                      width={400}
                      height={300}
                      unoptimized
                      className="h-auto max-h-48 w-full object-cover"
                      alt="Review"
                    />
                  </div>
                ) : null}

                {r.sellerReply?.trim() && r.sellerRepliedAt ? (
                  <div className="mt-3 border-l-2 border-emerald-500/35 bg-zinc-900/50 pl-3 pr-1 py-2">
                    <p className="text-[8px] font-medium uppercase tracking-wide text-emerald-200/80">
                      Operator reply
                    </p>
                    <div className="mt-1.5 flex items-start gap-2">
                      {r.operator.image ? (
                        <Image
                          src={r.operator.image}
                          width={24}
                          height={24}
                          className="h-6 w-6 shrink-0 rounded-full border border-white/10 object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-6 w-6 shrink-0 rounded-full border border-white/10 bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-200">
                          <XUsername
                            name={r.operator.name || "Operator"}
                            xHandle={r.operator.xHandle}
                            xUserId={r.operator.xUserId}
                          />
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-300 sm:text-[11px]">
                          {r.sellerReply}
                        </p>
                        <time
                          className="mt-1 block text-[8px] text-zinc-500"
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
        ))}
      </ul>
    </section>
  );
}
