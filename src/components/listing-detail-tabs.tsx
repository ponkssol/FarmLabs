"use client";

import { useMemo, useState, type ReactNode } from "react";

export type ListingTabId = "description" | "rules" | "access" | "reviews";

export type ListingTabSpec = {
  id: ListingTabId;
  label: string;
  content: ReactNode;
};

type Props = {
  tabs: ListingTabSpec[];
  defaultId?: ListingTabId;
};

const cardFrame =
  "overflow-hidden rounded-2xl border border-white/[0.04] bg-zinc-900/20 ring-1 ring-inset ring-white/[0.02]";

export function ListingDetailTabs({ tabs, defaultId }: Props) {
  const initial = useMemo(() => {
    if (tabs.length === 0) return null;
    if (defaultId && tabs.some((t) => t.id === defaultId)) return defaultId;
    return tabs[0]!.id;
  }, [tabs, defaultId]);

  const [active, setActive] = useState<ListingTabId | null>(initial);

  if (tabs.length === 0) return null;

  const current = tabs.find((t) => t.id === active) ?? tabs[0]!;

  if (tabs.length === 1) {
    return (
      <section className={cardFrame} aria-label="Listing details">
        <div className="px-3.5 py-3 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:text-xs sm:leading-relaxed">
          {current.content}
        </div>
      </section>
    );
  }

  return (
    <section className={cardFrame} aria-label="Listing details">
      <div className="border-b border-white/[0.05] px-2 py-2 sm:px-2.5 sm:py-2">
        <div
          role="tablist"
          aria-label="Section"
          className="flex flex-wrap gap-0.5 rounded-xl bg-zinc-950/50 p-0.5 ring-1 ring-inset ring-white/[0.04]"
        >
          {tabs.map((t) => {
            const isSel = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={isSel}
                aria-controls={`panel-${t.id}`}
                tabIndex={isSel ? 0 : -1}
                onClick={() => setActive(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-left text-[10px] font-medium transition sm:px-3 sm:py-1.5 sm:text-[11px] ${
                  isSel
                    ? "bg-zinc-800/90 text-zinc-100 shadow-sm ring-1 ring-white/5"
                    : "text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        role="tabpanel"
        id={`panel-${current.id}`}
        aria-labelledby={`tab-${current.id}`}
        className="px-3.5 py-3 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:py-3.5 sm:text-xs sm:leading-relaxed"
      >
        {current.content}
      </div>
    </section>
  );
}
