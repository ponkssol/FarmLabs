import { auth } from "@/auth";
import Image from "next/image";
import Link from "next/link";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md py-1 text-xs text-zinc-400 transition hover:text-white sm:text-sm"
    >
      {children}
    </Link>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:text-xs sm:tracking-[0.16em]">
        {title}
      </h2>
      <nav className="flex flex-col items-start gap-0.5">{children}</nav>
    </div>
  );
}

export async function SiteFooter() {
  const session = await auth();
  const year = 2026;

  return (
    <footer className="relative mt-auto border-t border-white/10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-40%,rgba(16,185,129,0.12),transparent_50%)]"
        aria-hidden
      />
      <div className="app-container relative py-10 sm:py-12 lg:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="sm:col-span-2 lg:col-span-5">
            <Link href="/" className="mb-4 inline-block" aria-label="FarmLabs home">
              <Image
                src="/farmlabs-logo.png"
                alt="FarmLabs"
                width={160}
                height={34}
                className="h-7 w-auto mix-blend-screen opacity-95 sm:h-8"
              />
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-zinc-500 sm:text-sm">
              Launch your community listing, share your Telegram/Discord access, and accept payments with secure escrow.
            </p>
            <p className="mt-4 text-[11px] text-zinc-600 sm:text-xs">
              Built for community operators and power users. Not financial advice.
            </p>
            {session?.user ? (
              <p className="mt-4 text-xs sm:text-sm">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center font-medium text-emerald-300/90 underline-offset-2 transition hover:text-emerald-200 hover:underline"
                >
                  Go to dashboard →
                </Link>
              </p>
            ) : (
              <p className="mt-4 text-xs sm:text-sm">
                <Link
                  href="/login?callbackUrl=/dashboard"
                  className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-zinc-100 transition hover:border-white/25 hover:bg-white/[0.1] sm:text-sm"
                >
                  Log in to get started
                </Link>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:col-span-2 lg:col-span-3">
            <FooterCol title="Discover">
              <FooterLink href="/">Home</FooterLink>
              <FooterLink href="/explore">Explore</FooterLink>
            </FooterCol>
            <FooterCol title="Sellers">
              <FooterLink href="/dashboard">Dashboard</FooterLink>
              {session?.user && !session.user.wallet ? (
                <span
                  className="inline-flex cursor-not-allowed items-center rounded-md py-1 text-xs text-zinc-600 sm:text-sm"
                  title="Connect and save your wallet first"
                >
                  New listing
                </span>
              ) : (
                <FooterLink href={session?.user?.wallet ? "/dashboard/new" : "/login?callbackUrl=/dashboard/new"}>
                  New listing
                </FooterLink>
              )}
            </FooterCol>
          </div>

          <div className="sm:col-span-2 sm:flex sm:items-start sm:justify-end lg:col-span-4">
            <div className="w-full max-w-sm rounded-xl border border-white/[0.07] bg-zinc-900/50 p-4 sm:p-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:text-xs">Get started</h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                Create a listing in minutes, set access tiers, and manage your buyers from one place.
              </p>
              {session?.user && !session.user.wallet ? (
                <span
                  className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-white/10 bg-zinc-800/70 py-2.5 text-xs font-medium text-zinc-500 sm:w-auto sm:px-4 sm:text-sm"
                  title="Connect and save your wallet first"
                >
                  Create listing
                </span>
              ) : (
                <Link
                  href={!session?.user ? "/login?callbackUrl=/dashboard/new" : "/dashboard/new"}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-zinc-100 py-2.5 text-xs font-medium text-zinc-950 transition hover:bg-white sm:w-auto sm:px-4 sm:text-sm"
                >
                  {session?.user ? "Create listing" : "Sign in to create"}
                </Link>
              )}
              <div className="mt-3 flex items-center gap-2 text-zinc-500">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900/60 transition hover:border-white/20 hover:text-zinc-300">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M21.4 4.6c-.3-.2-.8-.3-1.2-.1L3.1 11.2c-.5.2-.8.7-.8 1.2 0 .5.3 1 .8 1.1l4.5 1.5 1.7 5.2c.1.4.5.7 1 .8h.1c.4 0 .8-.2 1.1-.5l2.5-2.7 4.3 3.2c.2.2.5.2.8.2.2 0 .3 0 .5-.1.4-.2.7-.6.8-1l2.3-14c.1-.6-.2-1.1-.7-1.4Zm-3.6 4.2-7.3 6.7-.3 2.9-1-3.2-3.1-1 11.7-4.6Z" />
                  </svg>
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900/60 transition hover:border-white/20 hover:text-zinc-300">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M20.3 4.4A18 18 0 0 0 15.9 3l-.2.4c-.1.3-.3.7-.4 1.1a16.8 16.8 0 0 0-5.1 0c-.1-.4-.3-.8-.4-1.1L9.6 3a18 18 0 0 0-4.4 1.4A18.8 18.8 0 0 0 2 17.8c1.9 1.4 3.7 2.3 5.6 2.9.5-.7.9-1.5 1.2-2.3l-.7-.2c-.3-.1-.5-.2-.8-.4l.2-.2c3.4 1.6 7 1.6 10.4 0l.2.2c-.2.2-.5.3-.8.4l-.7.2c.3.8.7 1.6 1.2 2.3 1.9-.6 3.7-1.5 5.6-2.9a18.8 18.8 0 0 0-3.2-13.4ZM9 15.5c-1 0-1.7-.9-1.7-2s.8-2 1.7-2c1 0 1.8.9 1.7 2 0 1.1-.8 2-1.7 2Zm6 0c-1 0-1.7-.9-1.7-2s.8-2 1.7-2c1 0 1.8.9 1.7 2 0 1.1-.8 2-1.7 2Z" />
                  </svg>
                </span>
                <Link
                  href="https://x.com/farmlabs_co"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="FarmLabs on X"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900/60 text-[11px] font-semibold transition hover:border-white/20 hover:text-zinc-300"
                >
                  X
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/6 pt-6 sm:mt-12 sm:flex sm:items-end sm:justify-between sm:gap-4">
          <p className="text-xs text-zinc-500">
            © {year} FarmLabs. All rights reserved.
          </p>
          <p className="mt-2 max-w-md text-right text-xs leading-snug text-zinc-600 sm:mt-0 sm:text-sm">
            User-submitted listings only. Always do your own research before joining any paid group.
          </p>
        </div>
      </div>
    </footer>
  );
}
