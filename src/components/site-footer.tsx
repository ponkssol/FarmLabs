import { auth } from "@/auth";
import Image from "next/image";
import Link from "next/link";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md py-1 text-sm text-zinc-400 transition hover:text-white"
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
                className="h-7 w-auto opacity-95 sm:h-8"
              />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Pre-launch room for Solana and Pump.fun style launches: list your call, connect Telegram &amp; Discord, and
              get paid with escrow.
            </p>
            <p className="mt-4 text-xs text-zinc-600">
              Built for creators, collectors, and community leads — not a financial product.
            </p>
            {session?.user ? (
              <p className="mt-4 text-sm">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center font-medium text-emerald-300/90 underline-offset-2 transition hover:text-emerald-200 hover:underline"
                >
                  Open your dashboard →
                </Link>
              </p>
            ) : (
              <p className="mt-4 text-sm">
                <Link
                  href="/login?callbackUrl=/dashboard"
                  className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-zinc-100 transition hover:border-white/25 hover:bg-white/[0.1]"
                >
                  Log in to list or buy
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
              <FooterLink href="/dashboard/new">New listing</FooterLink>
            </FooterCol>
          </div>

          <div className="sm:col-span-2 sm:flex sm:items-start sm:justify-end lg:col-span-4">
            <div className="w-full max-w-sm rounded-xl border border-white/[0.07] bg-zinc-900/50 p-4 sm:p-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:text-xs">Get started</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Publish a paid or free listing, set tiers, and share one link with your X and Telegram.
              </p>
              <Link
                href={session?.user ? "/dashboard/new" : "/login?callbackUrl=/dashboard/new"}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white sm:w-auto sm:px-4"
              >
                {session?.user ? "Create a listing" : "Sign in to create"}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/6 pt-6 sm:mt-12 sm:flex sm:items-end sm:justify-between sm:gap-4">
          <p className="text-xs text-zinc-500">
            © {year} FarmLabs. All rights reserved.
          </p>
          <p className="mt-2 max-w-md text-right text-[11px] leading-snug text-zinc-600 sm:mt-0">
            Links are user-submitted. Always DYOR — this site does not endorse tokens or run trades.
          </p>
        </div>
      </div>
    </footer>
  );
}
