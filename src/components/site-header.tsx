import { auth } from "@/auth";
import Link from "next/link";
import { HeaderWalletConnect } from "./solana/header-wallet-connect";
import { SignInOut } from "./sign-in-out";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="app-container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            Farm<span className="text-zinc-500">Labs</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/explore" className="rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
              Explore
            </Link>
            {session && (
              <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/explore" className="shrink-0 rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white md:hidden">
            Explore
          </Link>
          <HeaderWalletConnect />
          <SignInOut
            hasSession={!!session}
            image={session?.user?.image ?? null}
            name={session?.user?.name ?? null}
          />
        </div>
      </div>
    </header>
  );
}


