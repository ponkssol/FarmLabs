import { auth } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import { Compass, Gift, LayoutGrid, Trophy } from "lucide-react";
import { HeaderWalletConnect } from "./solana/header-wallet-connect";
import { SignInOut } from "./sign-in-out";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="app-container relative flex h-16 items-center justify-between gap-2">
        <div className="flex items-center">
          <Link href="/" className="inline-flex items-center" aria-label="FarmLabs home">
            <Image
              src="/farmlabs-logo.png"
              alt="FarmLabs"
              width={180}
              height={38}
              priority
              className="h-8 w-auto mix-blend-screen sm:h-9"
            />
          </Link>
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
            <Link href="/explore" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <Compass className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Explore
            </Link>
            <span className="text-xs text-zinc-700" aria-hidden>
              |
            </span>
            <Link href="/leaderboard" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <Trophy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Leader Board
            </Link>
            <span className="text-xs text-zinc-700" aria-hidden>
              |
            </span>
            <Link href="/airdrop" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <Gift className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Airdrop
            </Link>
            {session && (
              <>
                <span className="text-xs text-zinc-700" aria-hidden>
                  |
                </span>
                <Link href="/dashboard" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white">
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  Dashboard
                </Link>
              </>
            )}
            {!session && (
              <span className="text-xs text-zinc-700" aria-hidden>
                |
              </span>
            )}
            {!session && (
              <span className="inline-flex h-8 items-center justify-center px-2.5 text-xs text-zinc-600">
                Dashboard
              </span>
            )}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <HeaderWalletConnect
            isAuthenticated={!!session?.user}
            userId={session?.user?.id ?? null}
            savedWallet={session?.user?.wallet ?? null}
          />
          <SignInOut
            hasSession={!!session}
            image={session?.user?.image ?? null}
            name={session?.user?.name ?? null}
            verified={Boolean(session?.user?.blueCheckmark)}
          />
        </div>
      </div>
    </header>
  );
}


