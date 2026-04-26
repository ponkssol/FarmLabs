import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="app-container flex flex-col items-center justify-between gap-3 text-xs text-zinc-500 sm:flex-row">
        <p>FarmLabs - Pre-launch planning and community hub for Pump.fun creators.</p>
        <div className="flex items-center gap-4">
          <Link href="/explore" className="hover:text-zinc-300">
            Explore
          </Link>
          <Link href="/login" className="hover:text-zinc-300">
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}


