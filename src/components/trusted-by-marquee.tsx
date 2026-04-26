"use client";

import Image from "next/image";

function LogoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 min-w-[140px] shrink-0 items-center justify-center rounded border border-white/10 bg-black/20 px-3 sm:h-[42px] sm:min-w-[160px]">
      {children}
    </div>
  );
}

function MarqueeGroup() {
  return (
    <>
      <LogoBox key="potion">
        <Image
          src="/trusted/potion-wordmark.png"
          alt="Potion"
          width={120}
          height={32}
          className="h-6 w-auto object-contain object-center opacity-95"
        />
      </LogoBox>
      {["ALPHA DAO", "SOL CREW", "DEGEN HUB", "MINT CLUB", "ONCHAIN X"].map((label) => (
        <LogoBox key={label}>
          <span className="text-center text-xs font-medium tracking-wide text-zinc-200 sm:text-sm">{label}</span>
        </LogoBox>
      ))}
    </>
  );
}

export function TrustedByMarquee() {
  return (
    <div className="border-y border-white/10 bg-white/[0.02] py-2">
      <p className="text-center text-[10px] uppercase tracking-[0.22em] text-zinc-500">Trusted by degen call operators</p>
      <div className="trusted-marquee-wrap relative mt-2 cursor-grab active:cursor-grabbing overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#09090b] to-transparent sm:w-16"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#09090b] to-transparent sm:w-16"
          aria-hidden
        />
        <div className="trusted-marquee-track flex w-max items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <MarqueeGroup />
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5" aria-hidden>
            <MarqueeGroup />
          </div>
        </div>
      </div>
    </div>
  );
}
