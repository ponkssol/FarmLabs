import { OperatorsSectionSearchable } from "@/components/leaderboard/operators-section-searchable";
import { fetchAllLeaderboardOperators } from "@/lib/leaderboard-operators";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "All Operators - FarmLabs",
  description: "Full leaderboard of all FarmLabs users ranked by listing views.",
};

export default async function AllOperatorsPage() {
  const operators = await fetchAllLeaderboardOperators();

  return (
    <div className="app-main-container pb-10 pt-6 sm:pb-12 sm:pt-8">
      <header className="mb-4 sm:mb-5">
        <Link
          href="/leaderboard"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Back
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Leader Board</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">All operators</h1>
        <p className="ui-form-hint mt-2 max-w-xl">
          Every FarmLabs user ranked by total listing views.
        </p>
      </header>

      <OperatorsSectionSearchable operators={operators} />
    </div>
  );
}
