"use client";

import {
  filterLeaderboardOperators,
  type LeaderboardOperator,
} from "@/lib/leaderboard-operators";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { OperatorsSection } from "./operators-section";

type Props = {
  operators: LeaderboardOperator[];
  className?: string;
};

export function OperatorsSectionSearchable({ operators, className }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => filterLeaderboardOperators(operators, query),
    [operators, query],
  );
  const isFiltering = query.trim().length > 0;

  const searchSlot = (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
        strokeWidth={2}
        aria-hidden
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, @handle, or listing…"
        aria-label="Search operators"
        className="ui-filter-input h-8 w-full min-w-0 pl-8 pr-8 text-xs"
      />
      {isFiltering ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 transition hover:text-zinc-300"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );

  return (
    <OperatorsSection
      operators={filtered}
      unfilteredTotal={operators.length}
      isFiltering={isFiltering}
      searchSlot={searchSlot}
      linkToProfile
      className={className}
    />
  );
}
