import { auth } from "@/auth";
import { escrowEligible, formatEscrowAmountLabel, formatListingPrice, resolvePriceCurrency } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import { redactVipSocialLinks } from "@/lib/redact-vip-text";
import { isPaidVipListing } from "@/lib/vip-link-access";
import { fetchEscrowUnlockedProjectIds, resolveVipViewForProject } from "@/lib/viewer-listing-access";
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
  const publicShortPitch =
    p.accessType === "PAID" && p.shortPitch
      ? redactVipSocialLinks(p.shortPitch)
      : p.shortPitch;
  return {
    title: `${p.title} - FarmLabs`,
    description: publicShortPitch,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const p = await prisma.project.findUnique({
    where: { slug },
    include: { user: { select: { name: true, image: true, wallet: true } } },
  });
  if (!p || !p.published) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;
  const unlocked = await fetchEscrowUnlockedProjectIds(viewerId, [p.id]);
  const { isOwner, maskVipLinks, redactVipText } = resolveVipViewForProject(
    p,
    viewerId,
    unlocked,
  );
  const aboutText = redactVipText && p.description ? redactVipSocialLinks(p.description) : p.description;
  const shortPitchText = redactVipText && p.shortPitch ? redactVipSocialLinks(p.shortPitch) : p.shortPitch;
  const rulesText = redactVipText && p.rules ? redactVipSocialLinks(p.rules) : p.rules;
  const policyText = redactVipText && p.deliveryPolicy ? redactVipSocialLinks(p.deliveryPolicy) : p.deliveryPolicy;

  const links = [
    { label: "X", href: p.xCommunity },
    { label: "Telegram", href: p.telegram },
    { label: "Discord", href: p.discord },
  ].filter((x) => x.href);
  const typeLabel = p.groupType === "PUBLIC" ? "Public" : "Private";
  const accessLabel = p.accessType === "PAID" ? "VIP" : "Open";
  const showPriceRow = p.groupType !== "PUBLIC";
  const canEscrow = escrowEligible(p);
  const escrowLabel =
    canEscrow && p.priceAmount != null
      ? formatEscrowAmountLabel(p.priceAmount, resolvePriceCurrency(p.priceCurrency))
      : null;

  return (
    <article className="app-container py-5 sm:py-6">
      <nav className="mb-3 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <Link href="/explore" className="transition hover:text-zinc-300">
          ← Explore
        </Link>
        <span className="uppercase tracking-widest text-zinc-600">Listing</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-3 lg:col-span-8">
          <header className="rounded-xl border border-white/10 bg-zinc-950/90 px-3.5 py-3 sm:px-4 sm:py-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Community call</p>
            <h1 className="mt-1 text-base font-semibold leading-snug tracking-tight text-white sm:text-[17px]">
              {p.title}
            </h1>
            {isOwner && isPaidVipListing(p) && (
              <p className="mb-1.5 rounded border border-amber-500/20 bg-amber-950/25 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/90">
                You own this listing: the public page matches what visitors see—community links and URLs stay hidden
                until someone completes escrow checkout. View or edit links in the dashboard.
              </p>
            )}
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">{shortPitchText}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              {p.user.image ? (
                <Image
                  src={p.user.image}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full border border-white/10 object-cover"
                  alt={p.user.name || "Operator"}
                />
              ) : (
                <div className="h-7 w-7 rounded-full border border-white/10 bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-200">{p.user.name || "Operator"}</p>
                {p.user.wallet && (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">{p.user.wallet}</p>
                )}
              </div>
            </div>
          </header>

          {(p.description?.trim() || links.length > 0) && (
            <section className="rounded-xl border border-white/10 bg-zinc-950/90">
              {p.description?.trim() ? (
                <>
                  <div className="border-b border-white/10 px-3.5 py-2 sm:px-4">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">About</h2>
                  </div>
                  <div className="px-3.5 py-2.5 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:text-xs sm:leading-relaxed">
                    {redactVipText && (
                      <p className="mb-2 border border-amber-500/15 bg-amber-950/20 px-2 py-1.5 text-[10px] text-amber-200/90">
                        Paid access: links to Telegram, X, and Discord in this description stay hidden until escrow
                        checkout is complete.
                      </p>
                    )}
                    <div className="whitespace-pre-wrap">{aboutText}</div>
                  </div>
                </>
              ) : null}
              {links.length > 0 && (
                <div
                  className={`px-3.5 py-2.5 sm:px-4 ${p.description?.trim() ? "border-t border-white/10" : ""}`}
                >
                  {maskVipLinks ? (
                    <div className="space-y-2">
                      <p className="text-[10px] leading-relaxed text-amber-200/90 sm:text-[11px]">
                        VIP: Telegram, X, and Discord links are hidden until you complete escrow checkout. After
                        payment, they appear here.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {links.map((l) => (
                          <span
                            key={l.label}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-950/20 px-2 py-1 text-[10px] text-amber-200/80"
                            title="Unlock with escrow"
                          >
                            {l.label}
                            <span className="text-amber-200/50">· locked</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {links.map((l) => (
                        <a
                          key={l.label}
                          href={l.href!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-white/12 px-2 py-1 text-[10px] text-zinc-300 transition hover:border-white/25 hover:text-white"
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {p.rules?.trim() ? (
            <section className="rounded-xl border border-white/10 bg-zinc-950/90">
              <div className="border-b border-white/10 px-3.5 py-2 sm:px-4">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Rules</h2>
              </div>
              <div className="px-3.5 py-2.5 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:text-xs sm:whitespace-pre-wrap">
                {rulesText}
              </div>
            </section>
          ) : null}

          {p.deliveryPolicy?.trim() ? (
            <section className="rounded-xl border border-white/10 bg-zinc-950/90">
              <div className="border-b border-white/10 px-3.5 py-2 sm:px-4">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">How access works</h2>
              </div>
              <div className="px-3.5 py-2.5 text-[11px] leading-relaxed text-zinc-300 sm:px-4 sm:text-xs sm:whitespace-pre-wrap">
                {policyText}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-20">
            <section className="rounded-xl border border-white/10 bg-zinc-950/95">
              <div className="border-b border-white/10 px-3.5 py-2 sm:px-4">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</h2>
              </div>
              <dl className="divide-y divide-white/5 px-3.5 py-0 text-[11px] sm:px-4">
                <div className="flex items-center justify-between gap-2 py-2">
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="font-medium text-zinc-200">{typeLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2">
                  <dt className="text-zinc-500">Access</dt>
                  <dd className="font-medium text-zinc-200">{accessLabel}</dd>
                </div>
                {showPriceRow && (
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="text-zinc-500">Price</dt>
                    <dd className="font-medium text-zinc-200">{formatListingPrice(p)}</dd>
                  </div>
                )}
                {p.category && (
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="text-zinc-500">Niche</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-zinc-200">{p.category}</dd>
                  </div>
                )}
              </dl>
            </section>

            {canEscrow ? (
              <div className="mt-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-2.5 sm:px-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
                  Escrow checkout
                </h3>
                <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-400 sm:text-[11px]">
                  {escrowLabel
                    ? `Pay ${escrowLabel} via escrow (MVP: order recorded; on-chain transfer not enforced in this build).`
                    : "Pay with escrow. Order is recorded for this demo; connect a wallet to complete the flow."}
                </p>
                <div className="mt-2.5">
                  <EscrowBuyButton
                    projectId={p.id}
                    amountLabel={escrowLabel ?? undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2.5 rounded-xl border border-white/10 bg-zinc-900/40 px-3.5 py-2.5 text-[10px] leading-relaxed text-zinc-500 sm:px-4 sm:text-[11px]">
                {p.accessType === "FREE"
                  ? "This is a public or free listing. No checkout required."
                  : "Checkout is not required for this listing type."}
              </div>
            )}

            <div className="mt-2.5">
              <Link
                href="/explore"
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/12 px-2.5 py-1.5 text-[10px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              >
                View more listings
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
