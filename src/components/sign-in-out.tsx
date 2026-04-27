"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  hasSession: boolean;
  image: string | null;
  name: string | null;
  verified?: boolean;
};

export function SignInOut({ hasSession, image, name, verified = false }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hasSession) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/login"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
        >
          Log in
        </Link>
      </div>
    );
  }

  const display = name || "Member";

  return (
    <div className="relative flex shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-full items-center gap-1.5 rounded-md border border-transparent py-1 pl-1 pr-1 transition hover:border-white/10 hover:bg-white/5 sm:gap-2 sm:pr-2"
        aria-expanded={open}
        aria-haspopup="menu"
        title={display}
      >
        {image ? (
          <Image
            src={image}
            width={30}
            height={30}
            className="h-7 w-7 shrink-0 rounded-full border border-white/10 object-cover sm:h-8 sm:w-8"
            alt=""
          />
        ) : (
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-sm font-semibold text-zinc-300 sm:h-8 sm:w-8"
            aria-hidden
          >
            {display.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <span className="hidden max-w-[7rem] items-center text-left text-xs text-zinc-400 sm:inline-flex sm:max-w-[9rem] sm:text-sm">
          <span className="truncate">{display}</span>
          {verified ? (
            <Image
              src="/verified-badge.png"
              alt="Verified"
              width={12}
              height={12}
              className="ml-1 h-3 w-3 shrink-0"
            />
          ) : null}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[100] min-w-[10.5rem] overflow-hidden rounded-lg border border-white/10 bg-zinc-950/95 py-1 shadow-lg shadow-black/50 backdrop-blur-sm"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2.5 text-left text-xs text-zinc-200 transition hover:bg-white/10 sm:text-sm"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/" });
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
