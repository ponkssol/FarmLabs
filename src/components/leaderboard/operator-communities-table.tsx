"use client";

import { formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import type { OperatorCommunity } from "@/lib/operator-profile";
import { ExternalLink, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatViews(n: number) {
  return n.toLocaleString("en-US");
}

function formatSoldAt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortenHash(hash: string) {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function TxLink({ signature, label }: { signature: string | null; label: string }) {
  if (!signature) {
    return (
      <span className="text-zinc-600" title={label}>
        —
      </span>
    );
  }
  return (
    <a
      href={`https://solscan.io/tx/${signature}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 font-mono text-[11px] text-sky-400/90 transition hover:text-sky-300"
      title={signature}
    >
      <span className="truncate">{shortenHash(signature)}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
    </a>
  );
}

function EarningsCell({ sol, usdc }: { sol: number; usdc: number }) {
  if (sol <= 0 && usdc <= 0) {
    return <span className="text-zinc-600">—</span>;
  }
  return (
    <span className="text-zinc-300">
      {sol > 0 ? (
        <span className="mr-2 inline-block tabular-nums">{formatEscrowAmountLabel(sol, "SOL")}</span>
      ) : null}
      {usdc > 0 ? (
        <span className="inline-block tabular-nums">{formatEscrowAmountLabel(usdc, "USDC")}</span>
      ) : null}
    </span>
  );
}

function SalesDetailModal({
  community,
  onClose,
}: {
  community: OperatorCommunity;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sales-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85vh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 id="sales-detail-title" className="truncate text-sm font-semibold text-white sm:text-base">
              Sales detail — {community.title}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {community.sales.length} completed sale{community.sales.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="lb-scroll min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-5 sm:py-4">
          {community.sales.length === 0 ? (
            <p className="text-xs text-zinc-500">No completed sales for this community yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-white/8">
              <table className="w-full min-w-[680px] border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-900/80 text-xs font-medium uppercase tracking-widest text-zinc-500">
                    <th className="px-3 py-2 font-medium">Sold at</th>
                    <th className="px-3 py-2 font-medium">Tier</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 text-right font-medium">Net earnings</th>
                    <th className="px-3 py-2 font-medium">Buyer payment tx</th>
                    <th className="px-3 py-2 font-medium">Settlement tx</th>
                  </tr>
                </thead>
                <tbody>
                  {community.sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-300">
                        {formatSoldAt(sale.soldAt)}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{sale.priceOptionLabel || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                        {formatEscrowAmountLabel(sale.amount, resolvePriceCurrency(sale.currency))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-400/90">
                        {formatEscrowAmountLabel(sale.netEarnings, resolvePriceCurrency(sale.currency))}
                      </td>
                      <td className="max-w-[140px] px-3 py-2">
                        <TxLink signature={sale.buyerPaymentSignature} label="Buyer payment" />
                      </td>
                      <td className="max-w-[140px] px-3 py-2">
                        <TxLink signature={sale.settlementSignature} label="Settlement" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type Props = {
  communities: OperatorCommunity[];
};

export function OperatorCommunitiesTable({ communities }: Props) {
  const [selected, setSelected] = useState<OperatorCommunity | null>(null);

  return (
    <>
      <div className="lb-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-900/60 text-xs font-medium uppercase tracking-widest text-zinc-500">
              <th className="px-3.5 py-2.5 font-medium">Community</th>
              <th className="px-3.5 py-2.5 font-medium">Type</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Views</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Sales</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Earnings</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {communities.map((c) => {
              const hasSales = c.completedSales > 0;

              return (
                <tr key={c.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3.5 py-2.5">
                    <Link href={`/p/${c.slug}`} className="group flex min-w-0 items-center gap-2.5">
                      {c.communityImage ? (
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10">
                          <Image
                            src={c.communityImage}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-900 text-xs font-semibold text-zinc-400">
                          {c.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate font-medium text-zinc-200 group-hover:text-sky-300">
                        {c.title}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-500">
                    {c.groupType === "PUBLIC" ? "Public" : c.accessType === "PAID" ? "Paid VIP" : "Private"}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums text-zinc-400">
                    {formatViews(c.viewCount)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums text-zinc-400">
                    {c.completedSales}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <EarningsCell sol={c.solEarnings} usdc={c.usdcEarnings} />
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={!hasSales}
                      onClick={() => setSelected(c)}
                      className="inline-flex h-7 items-center rounded-md border border-white/10 px-2.5 text-xs font-medium text-zinc-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      View detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected ? (
        <SalesDetailModal community={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
