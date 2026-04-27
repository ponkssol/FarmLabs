import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs - FarmLabs",
  description:
    "Complete documentation for FarmLabs: system flow, listing setup, monetization strategy, buyer steps, and payment flow.",
};

export default function DocsPage() {
  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "system-flow", label: "System Flow" },
    { id: "operator-setup", label: "Operator Setup" },
    { id: "field-guide", label: "Field Guide" },
    { id: "monetization", label: "Monetization" },
    { id: "buyer-steps", label: "Buyer Steps" },
    { id: "fees", label: "Fees" },
    { id: "money-flow", label: "Money Flow" },
    { id: "publish-checklist", label: "Publish Checklist" },
  ];
  const flowSteps = [
    { title: "Create", desc: "Operator creates a listing" },
    { title: "Discover", desc: "Buyer discovers it from Explore" },
    { title: "Checkout", desc: "Buyer pays with wallet" },
    { title: "Confirm", desc: "Transaction gets confirmed" },
    { title: "Access", desc: "Community access is unlocked" },
    { title: "Track", desc: "Records are tracked in dashboard" },
  ];

  return (
    <div className="app-main-container py-8 sm:py-10">
      <section className="hero-glow rounded-xl border border-white/10 bg-zinc-950/70 p-4 sm:p-5">
        <h1 className="text-lg font-semibold tracking-tight text-white sm:text-2xl">FarmLabs Documentation</h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">
          Professional guide for creating listings, monetizing communities, understanding buyer checkout flow, and
          tracking payment lifecycle.
        </p>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <nav className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Docs Menu</p>
            <ul className="space-y-1.5">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="group inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 transition hover:translate-x-1 hover:bg-white/5 hover:text-white"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 transition group-hover:bg-emerald-400" />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="space-y-3">
          <article id="overview" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Overview</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              FarmLabs is a community marketplace where operators publish private/public call listings and buyers join
              access through wallet checkout. The platform connects discovery, purchase, and access management in one
              flow.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {["Create Listing", "Get Buyers", "Monetize Community"].map((label) => (
                <div
                  key={label}
                  className="stat-card rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-center text-[11px] text-zinc-300 sm:text-xs"
                >
                  <div className="signal-dot mx-auto mb-1 h-2 w-2 rounded-full bg-emerald-400" />
                  {label}
                </div>
              ))}
            </div>
          </article>

          <article id="system-flow" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">System Flow</h2>
            <p className="mt-1 text-[11px] text-zinc-500 sm:text-xs">From listing creation to buyer access completion.</p>
            <div className="flow-timeline mt-3">
              {flowSteps.map((item, idx) => (
                <div key={item.title} className="flow-node" style={{ animationDelay: `${idx * 0.12}s` }}>
                  <div className="flow-node-head">
                    <span className="flow-node-index">{idx + 1}</span>
                    <span className="flow-node-title">{item.title}</span>
                  </div>
                  <p className="flow-node-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </article>

          <article id="operator-setup" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Operator Setup (Step-by-Step)</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              <li>Sign in with X account.</li>
              <li>Connect wallet and save it in Dashboard.</li>
              <li>Open `Dashboard → New listing`.</li>
              <li>Fill call details, access model, and invite links.</li>
              <li>Activate `Publish in directory` for public discovery.</li>
              <li>Save, then verify listing card and detail page rendering.</li>
            </ol>
          </article>

          <article id="field-guide" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Field Guide (What To Fill)</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="doc-subcard rounded-lg border border-white/10 bg-zinc-900/60 p-3">
                <p className="text-xs font-medium text-zinc-100 sm:text-sm">Identity and Content</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-zinc-400 sm:text-xs">
                  <li>`Name` (required): clear, specific title.</li>
                  <li>`Pitch` (required): one-line value proposition.</li>
                  <li>`Description`: strategy and value details.</li>
                  <li>`Logo` and images: improve trust and conversion.</li>
                </ul>
              </div>
              <div className="doc-subcard rounded-lg border border-white/10 bg-zinc-900/60 p-3">
                <p className="text-xs font-medium text-zinc-100 sm:text-sm">Access and Delivery</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-zinc-400 sm:text-xs">
                  <li>`Call type`: public or private.</li>
                  <li>`Access`: free or paid VIP.</li>
                  <li>`Price/tier`: simple tier names and clear value.</li>
                  <li>`Telegram/Discord links`: valid and active invites.</li>
                </ul>
              </div>
            </div>
          </article>

          <article id="monetization" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">How To Monetize Your Group</h2>
            <div className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              <p>
                Start with a <span className="font-medium text-zinc-100">free/public layer</span> to build audience and trust.
                Then direct engaged members to <span className="font-medium text-zinc-100">paid VIP tiers</span> with deeper
                insights, faster updates, or private strategy rooms.
              </p>
              <p>
                Recommended model: free teaser content plus paid premium access. Keep your offer specific:
                `what buyers get`, `delivery frequency`, and `membership duration`.
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { t: "Tier 1", d: "Starter signals", c: "bg-blue-400/70" },
                { t: "Tier 2", d: "Advanced analysis", c: "bg-violet-400/70" },
                { t: "Tier 3", d: "VIP private room", c: "bg-amber-400/80" },
              ].map((item) => (
                <div key={item.t} className="tier-card rounded-lg border border-white/10 bg-zinc-900/70 p-3">
                  <p className="text-xs font-medium text-zinc-100 sm:text-sm">{item.t}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400 sm:text-xs">{item.d}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`tier-bar h-full w-2/3 rounded-full ${item.c}`} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article id="buyer-steps" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Buyer Steps (How To Buy)</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              <li>Sign in and connect wallet.</li>
              <li>Open listing detail and review pitch, rules, and links.</li>
              <li>Choose tier and click `Join`.</li>
              <li>Approve transaction in wallet popup.</li>
              <li>Wait until status is confirmed in app.</li>
              <li>Open Dashboard purchases and access community links.</li>
            </ol>
          </article>

          <article id="fees" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Fees</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-950/10 p-3">
                <p className="text-xs font-semibold text-emerald-200">Listing fee: Free</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">
                  Creating and publishing listings on FarmLabs is free.
                </p>
              </div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-950/10 p-3">
                <p className="text-xs font-semibold text-amber-200">Success fee: 0.01</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 sm:text-xs">
                  A `0.01` fee is charged only for each successful transaction.
                </p>
              </div>
            </div>
          </article>

          <article id="money-flow" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Money Flow (Where The Money Goes)</h2>
            <div className="mt-2 grid gap-2">
              {[
                "Buyer sends payment from connected wallet.",
                "Blockchain confirms transaction.",
                "Platform updates purchase and sales records.",
                "Operator receives revenue via configured checkout flow.",
                "Buyer gets access path after successful payment state.",
              ].map((line, idx) => (
                <div key={line} className="money-step flex items-start gap-2 rounded-lg border border-white/10 bg-zinc-900/60 p-2">
                  <span className="mt-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/10 text-[10px] text-zinc-300">
                    {idx + 1}
                  </span>
                  <p className="text-[11px] text-zinc-300 sm:text-xs">{line}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
              Note: verify final payment status in Dashboard before granting manual off-platform access.
            </p>
          </article>

          <article id="publish-checklist" className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Publish Checklist</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              <li>Wallet connected and saved.</li>
              <li>Name and pitch are clean and specific.</li>
              <li>Price/tier logic is correct.</li>
              <li>Telegram/Discord links are tested.</li>
              <li>Rules and onboarding instructions are clear.</li>
              <li>`Publish in directory` enabled (for Explore visibility).</li>
            </ul>
          </article>

          <article className="doc-card rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Need More Help?</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">
              Go to Explore for discovery and Dashboard for operations, analytics, purchases, and sales tracking.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/explore"
                className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Explore calls
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Open dashboard
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

