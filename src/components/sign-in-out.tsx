"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  hasSession: boolean;
  image: string | null;
  name: string | null;
};

export function SignInOut({ hasSession, image, name }: Props) {
  if (!hasSession) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {image && (
        <Image
          src={image}
          width={30}
          height={30}
          className="rounded-full border border-white/10"
          alt=""
        />
      )}
      <span className="hidden max-w-[120px] truncate text-xs text-zinc-500 sm:inline" title={name || ""}>
        {name || "Member"}
      </span>
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/" })}
        className="rounded-md border border-white/15 px-3 py-2 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white sm:text-sm"
      >
        Sign out
      </button>
    </div>
  );
}
