"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  q: string;
  platform: "ALL" | "TELEGRAM" | "DISCORD";
  type: "ALL" | "PUBLIC" | "PRIVATE";
  access: "ALL" | "FREE" | "PAID";
  sort: "newest" | "oldest" | "price_asc" | "price_desc";
  minPrice: string;
  maxPrice: string;
  hasActiveFilters: boolean;
};

export function ExploreFilters({
  q,
  platform,
  type,
  access,
  sort,
  minPrice,
  maxPrice,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(q);
  const [platformValue, setPlatformValue] = useState(platform);
  const [typeValue, setTypeValue] = useState(type);
  const [accessValue, setAccessValue] = useState(access);
  const [sortValue, setSortValue] = useState(sort);
  const [minValue, setMinValue] = useState(minPrice);
  const [maxValue, setMaxValue] = useState(maxPrice);

  const apply = (next: {
    q?: string;
    platform?: string;
    type?: string;
    access?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string | undefined, fallback?: string) => {
      const v = (value ?? "").trim();
      if (!v || (fallback != null && v === fallback)) {
        params.delete(key);
      } else {
        params.set(key, v);
      }
    };
    setOrDelete("q", next.q);
    setOrDelete("platform", next.platform, "ALL");
    setOrDelete("type", next.type, "ALL");
    setOrDelete("access", next.access, "ALL");
    setOrDelete("sort", next.sort, "newest");
    setOrDelete("minPrice", next.minPrice);
    setOrDelete("maxPrice", next.maxPrice);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      apply({
        q: query,
        platform: platformValue,
        type: typeValue,
        access: accessValue,
        sort: sortValue,
        minPrice: minValue,
        maxPrice: maxValue,
      });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, minValue, maxValue]);

  const applyInstant = (changes: Partial<{ platform: string; type: string; access: string; sort: string }>) => {
    const next = {
      q: query,
      platform: changes.platform ?? platformValue,
      type: changes.type ?? typeValue,
      access: changes.access ?? accessValue,
      sort: changes.sort ?? sortValue,
      minPrice: minValue,
      maxPrice: maxValue,
    };
    apply(next);
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search…"
          className="ui-filter-input min-h-0 min-w-0 flex-1"
        />
        <div className="flex shrink-0 gap-1.5 sm:items-stretch">
          {hasActiveFilters && (
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-md border border-white/12 px-2.5 py-1 text-center text-xs text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 sm:px-3"
            >
              Clear
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={platformValue}
          onChange={(e) => {
            setPlatformValue(e.target.value as Props["platform"]);
            applyInstant({ platform: e.target.value });
          }}
          className="ui-filter-select h-7 min-w-0 max-w-full flex-1 sm:max-w-[8.2rem] sm:flex-none"
        >
          <option value="ALL">Platform</option>
          <option value="TELEGRAM">Telegram</option>
          <option value="DISCORD">Discord</option>
        </select>
        <select
          value={typeValue}
          onChange={(e) => {
            setTypeValue(e.target.value as Props["type"]);
            applyInstant({ type: e.target.value });
          }}
          className="ui-filter-select h-7 min-w-0 max-w-full flex-1 sm:max-w-[7.8rem] sm:flex-none"
        >
          <option value="ALL">Type</option>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
        <select
          value={accessValue}
          onChange={(e) => {
            setAccessValue(e.target.value as Props["access"]);
            applyInstant({ access: e.target.value });
          }}
          className="ui-filter-select h-7 min-w-0 max-w-full flex-1 sm:max-w-[7rem] sm:flex-none"
        >
          <option value="ALL">Access</option>
          <option value="FREE">Open</option>
          <option value="PAID">VIP</option>
        </select>
        <select
          value={sortValue}
          onChange={(e) => {
            setSortValue(e.target.value as Props["sort"]);
            applyInstant({ sort: e.target.value });
          }}
          className="ui-filter-select h-7 min-w-0 max-w-full flex-1 sm:max-w-[10rem] sm:flex-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <input
            type="number"
            min={0}
            step="0.01"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            placeholder="Min $"
            className="ui-filter-input h-7 w-16 px-2 sm:w-[5rem]"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            placeholder="Max $"
            className="ui-filter-input h-7 w-16 px-2 sm:w-[5rem]"
          />
        </div>
      </div>
      <p className="text-[10px] text-zinc-600 sm:text-xs">Tip: price filter is applied to VIP listings only.</p>
    </div>
  );
}

