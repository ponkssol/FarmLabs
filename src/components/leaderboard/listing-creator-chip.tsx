"use client";

import { CreatorAvatar } from "@/components/creator-avatar";
import Link from "next/link";

type UserSlice = {
  id: string;
  name: string | null;
  image: string | null;
};

export function ListingCreatorChip({ user }: { user: UserSlice }) {
  return (
    <Link
      href={`/leaderboard/operators/${user.id}`}
      className="relative z-10 mt-0.5 inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-zinc-500 transition hover:text-sky-300"
    >
      <CreatorAvatar
        src={user.image}
        alt={user.name || "Creator"}
        width={14}
        height={14}
        className="h-3.5 w-3.5 rounded-full border border-white/10 object-cover"
      />
      <span className="truncate">{user.name || "Anonymous"}</span>
    </Link>
  );
}
