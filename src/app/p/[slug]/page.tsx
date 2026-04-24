import { prisma } from "@/lib/prisma";
import { EscrowBuyButton } from "@/components/escrow-buy-button";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.project.findUnique({ where: { slug } });
  if (!p || !p.published) return { title: "Not found" };
  return {
    title: `${p.title} - FarmLabs`,
    description: p.shortPitch,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const p = await prisma.project.findUnique({
    where: { slug },
    include: { user: { select: { name: true, image: true, wallet: true } } },
  });
  if (!p || !p.published) notFound();

  const links = [
    { label: "X", href: p.xCommunity },
    { label: "Telegram", href: p.telegram },
    { label: "Discord", href: p.discord },
  ].filter((x) => x.href);
  const escrowEligible = p.groupType === "PRIVATE" && p.accessType === "PAID";
  const typeLabel = p.groupType === "PUBLIC" ? "Public call" : "Private call";
  const accessLabel = p.accessType === "PAID" ? "VIP" : "Open";
  const priceLabel = p.accessType === "PAID" ? `$${p.priceUsd?.toFixed(2) ?? "0.00"}` : "Free";

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-10">
        <div className="space-y-6 lg:col-span-7">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Community call listing</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">{p.title}</h1>
            <p className="mt-2 text-sm text-zinc-400">{p.shortPitch}</p>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/80 p-3">
              {p.user.image ? (
                <Image src={p.user.image} width={40} height={40} className="rounded-full border border-white/10" alt={p.user.name || "Creator"} />
              ) : (
                <div className="h-10 w-10 rounded-full border border-white/10 bg-zinc-800" />
              )}
              <div>
                <p className="text-sm font-medium text-zinc-100">{p.user.name || "Creator"}</p>
                {p.user.wallet && <p className="font-mono text-xs text-zinc-500 break-all">{p.user.wallet}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Data komunitas</h2>
            <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {p.description}
            </div>

            {links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Rules</h2>
            <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {p.rules}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Access delivery</h2>
            <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {p.deliveryPolicy}
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-3">
          <section className="sticky top-20 rounded-2xl border border-white/10 bg-zinc-950/90 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Status grup</h2>
            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-xs">
              <p className="text-zinc-400">
                Type: <span className="text-zinc-200">{typeLabel}</span>
              </p>
              <p className="text-zinc-400">
                Access: <span className="text-zinc-200">{accessLabel}</span>
              </p>
              <p className="text-zinc-400">
                Price: <span className="text-zinc-200">{priceLabel}</span>
              </p>
              {p.category && (
                <p className="text-zinc-400">
                  Niche: <span className="text-zinc-200">{p.category}</span>
                </p>
              )}
              {p.memberCount != null && (
                <p className="text-zinc-400">
                  Members: <span className="text-zinc-200">{p.memberCount.toLocaleString("en-US")}</span>
                </p>
              )}
            </div>

            {escrowEligible ? (
              <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-900/10 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Checkout private call</h3>
                <p className="mt-2 text-xs text-zinc-400">
                  Untuk grup private/VIP, bayar lewat escrow dan order otomatis direkam.
                </p>
                <div className="mt-3">
                  <EscrowBuyButton projectId={p.id} />
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-xs text-zinc-400">
                Ini call publik atau free, jadi tidak butuh checkout escrow.
              </div>
            )}

            <div className="mt-5">
              <Link
                href="/explore"
                className="inline-flex rounded-md border border-white/20 px-3 py-2 text-xs text-zinc-300 transition hover:border-white/35 hover:text-white"
              >
                ← Back to directory
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}



