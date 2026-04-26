import { WalletLinkPanel } from "@/components/solana/wallet-link-panel";
import { auth } from "@/auth";
import { formatEscrowAmountLabel, resolvePriceCurrency } from "@/lib/listing-price";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - FarmLabs",
};

type ListingFilter = "ALL" | "PUBLIC" | "PRIVATE" | "PAID";
const statusItems: Array<{ key: ListingFilter; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "PUBLIC", label: "Public" },
  { key: "PRIVATE", label: "Private" },
  { key: "PAID", label: "Paid" },
];

type Props = {
  searchParams: Promise<{ status?: ListingFilter }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { status = "ALL" } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
      ...(status === "PUBLIC"
        ? { groupType: "PUBLIC" }
        : status === "PRIVATE"
          ? { groupType: "PRIVATE" }
          : status === "PAID"
            ? { accessType: "PAID" }
            : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  const history = await prisma.escrowOrder.findMany({
    where: {
      OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    include: { project: { select: { title: true } } },
  });

  const totalProjects = await prisma.project.count({ where: { userId: session.user.id } });
  const hasWallet = !!session.user.wallet;
  const publicCount = await prisma.project.count({
    where: { userId: session.user.id, groupType: "PUBLIC" },
  });
  const privateCount = await prisma.project.count({
    where: { userId: session.user.id, groupType: "PRIVATE" },
  });
  const paidCount = await prisma.project.count({
    where: { userId: session.user.id, accessType: "PAID" },
  });

  return (
    <div className="app-container py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-10">
        <div className="space-y-6 lg:col-span-7">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Your call listings</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{projects.length} total</span>
                <Link
                  href={hasWallet ? "/dashboard/new" : "/dashboard"}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    hasWallet
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "cursor-not-allowed border border-white/10 text-zinc-500"
                  }`}
                  aria-disabled={!hasWallet}
                  tabIndex={hasWallet ? 0 : -1}
                >
                  New
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {statusItems.map((item) => {
                const active = status === item.key;
                return (
                  <Link
                    key={item.key}
                    href={`/dashboard${item.key === "ALL" ? "" : `?status=${item.key}`}`}
                    className={`rounded-md px-3 py-1.5 text-xs transition ${
                      active
                        ? "bg-white text-black"
                        : "border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {projects.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-zinc-900/40 p-6 text-center">
                <p className="text-sm text-zinc-400">No call listings yet.</p>
                <p className="mt-1 text-xs text-zinc-600">Connect wallet, then create your first public or private call listing.</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {projects.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{p.title}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {p.published ? "Public listing" : "Draft"} · {p.groupType} · {p.accessType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      {p.published && (
                        <Link
                          href={`/p/${p.slug}`}
                          className="rounded-md border border-white/10 px-2.5 py-1 text-zinc-300 hover:border-white/25 hover:text-white"
                        >
                          View page
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/edit/${p.id}`}
                        className="rounded-md border border-white/15 px-2.5 py-1 text-zinc-200 hover:border-white/30"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-6">
            <h2 className="text-base font-semibold text-white">Escrow fills</h2>
            <p className="mt-1 text-xs text-zinc-500">Latest fills from private/VIP call purchases.</p>
            <ul className="mt-4 space-y-2.5">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-xs text-zinc-400"
                >
                  <span className="text-zinc-200">{h.project.title}</span> · {h.status} ·{" "}
                  {formatEscrowAmountLabel(h.amount, resolvePriceCurrency(h.currency))} · updated{" "}
                  {new Date(h.updatedAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/90 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  width={56}
                  height={56}
                  className="rounded-full border border-white/10"
                  alt={session.user.name || "Profile"}
                />
              ) : (
                <div className="h-14 w-14 rounded-full border border-white/10 bg-zinc-800" />
              )}
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">
                  {session.user.name || "Creator"}
                </h1>
                <p className="text-xs text-zinc-500">Profile</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-3 text-xs">
              <p className="text-zinc-400">
                Wallet: <span className="text-zinc-200">{hasWallet ? "Verified" : "Not connected"}</span>
              </p>
              <p className="text-zinc-400">
                Listings: <span className="text-zinc-200">{totalProjects}</span>
              </p>
              <p className="text-zinc-400">
                Mix: <span className="text-zinc-200">{publicCount} public / {privateCount} private / {paidCount} paid</span>
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/90 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-white">Wallet verification</h2>
            <div className="mt-3">
              <WalletLinkPanel />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}



