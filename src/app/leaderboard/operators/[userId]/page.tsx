import { OperatorProfilePanel } from "@/components/leaderboard/operator-profile-panel";
import { fetchOperatorProfile } from "@/lib/operator-profile";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const profile = await fetchOperatorProfile(userId);
  if (!profile) {
    return { title: "Operator not found - FarmLabs" };
  }
  const name = profile.user.name || "Operator";
  return {
    title: `${name} - Operator Profile`,
    description: `${name}'s FarmLabs communities, views, and sales earnings.`,
  };
}

export default async function OperatorProfilePage({ params }: Props) {
  const { userId } = await params;
  const profile = await fetchOperatorProfile(userId);
  if (!profile) notFound();

  return (
    <div className="app-main-container pb-10 pt-6 sm:pb-12 sm:pt-8">
      <header className="mb-4 sm:mb-5">
        <Link
          href="/leaderboard/operators"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          All operators
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">Leader Board</p>
        <p className="ui-form-hint mt-2 max-w-xl">Operator profile, communities, and sales earnings.</p>
      </header>

      <OperatorProfilePanel profile={profile} />
    </div>
  );
}
