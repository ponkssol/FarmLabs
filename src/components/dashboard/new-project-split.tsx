"use client";

import { normalizeProjectForm, projectFormSchema, type ProjectForm } from "@/lib/project-schema";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const initialValues: ProjectForm = {
  title: "",
  shortPitch: "",
  description: "",
  groupType: "PUBLIC",
  accessType: "FREE",
  priceUsd: undefined,
  category: "",
  memberCount: undefined,
  rules: "",
  deliveryPolicy: "",
  xCommunity: "",
  telegram: "",
  discord: "",
  published: false,
};

type Props = {
  creatorName: string | null;
  creatorImage: string | null;
  wallet: string | null;
};

export function NewProjectSplit({ creatorName, creatorImage, wallet }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectForm>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const links = useMemo(
    () =>
      [
        { label: "Telegram", value: values.telegram },
        { label: "X", value: values.xCommunity },
        { label: "Discord", value: values.discord },
      ].filter((l) => l.value && l.value.trim().length > 0),
    [values.telegram, values.xCommunity, values.discord],
  );

  const set = <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const parsed = projectFormSchema.safeParse({
      ...values,
      priceUsd: values.priceUsd,
      memberCount: values.memberCount,
      xCommunity: values.xCommunity || undefined,
      discord: values.discord || undefined,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setError(firstIssue?.message ?? "Please check your fields.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = normalizeProjectForm(parsed.data);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Failed to create project");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-10">
      <form onSubmit={onSubmit} className="space-y-6 lg:col-span-7">
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-white">Community call details</h2>
          <p className="mt-1 text-xs text-zinc-500">Fill the form, preview updates instantly on the right.</p>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="text-xs text-zinc-400">Call name</label>
              <input
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="e.g. Solana Insider Club"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Pitch</label>
              <textarea
                value={values.shortPitch}
                onChange={(e) => set("shortPitch", e.target.value)}
                className="mt-1 min-h-[90px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="One paragraph for your core narrative."
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Call description</label>
              <textarea
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                className="mt-1 min-h-[130px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Explain value, posting style, and target members."
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-white">Public/private and monetization</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-zinc-400">Call type</label>
              <select
                value={values.groupType}
                onChange={(e) => set("groupType", e.target.value as ProjectForm["groupType"])}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="PUBLIC">Public call</option>
                <option value="PRIVATE">Private call</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Access mode</label>
              <select
                value={values.accessType}
                onChange={(e) => set("accessType", e.target.value as ProjectForm["accessType"])}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="FREE">Free/Open</option>
                <option value="PAID">Paid/VIP</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Price (USD, for private VIP)</label>
              <input
                value={values.priceUsd ?? ""}
                onChange={(e) => set("priceUsd", e.target.value === "" ? undefined : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="e.g. 49"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Category</label>
              <input
                value={values.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="e.g. Alpha calls"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Members (optional)</label>
              <input
                value={values.memberCount ?? ""}
                onChange={(e) => set("memberCount", e.target.value === "" ? undefined : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="e.g. 1200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-400">Call rules</label>
              <textarea
                value={values.rules}
                onChange={(e) => set("rules", e.target.value)}
                className="mt-1 min-h-[140px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Posting rules, no spam policy, allowed topics..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-400">Access delivery policy</label>
              <textarea
                value={values.deliveryPolicy}
                onChange={(e) => set("deliveryPolicy", e.target.value)}
                className="mt-1 min-h-[120px] w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="How buyer gets access after payment and expected response time."
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-white">Community links</h2>
          <div className="mt-4 grid gap-3">
            <input
              value={values.telegram}
              onChange={(e) => set("telegram", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="https://t.me/..."
            />
            <input
              value={values.xCommunity ?? ""}
              onChange={(e) => set("xCommunity", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="https://x.com/..."
            />
            <input
              value={values.discord ?? ""}
              onChange={(e) => set("discord", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="https://discord.gg/..."
            />
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={!!values.published}
              onChange={(e) => set("published", e.target.checked)}
              className="h-4 w-4 rounded border-white/20"
            />
            Publish this call publicly
          </label>

          {error && (
            <div className="mt-3 rounded-md border border-rose-400/30 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Create call listing"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-md border border-white/20 px-4 py-2 text-sm text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </section>
      </form>

      <aside className="lg:col-span-3">
        <div className="sticky top-20 rounded-2xl border border-white/10 bg-zinc-950/90 p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-white">Live preview</h2>
          <p className="mt-1 text-xs text-zinc-500">How your listing will look to users.</p>

          <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="flex items-center gap-3">
              {creatorImage ? (
                <Image src={creatorImage} alt={creatorName || "Creator"} width={36} height={36} className="rounded-full border border-white/10" />
              ) : (
                <div className="h-9 w-9 rounded-full border border-white/10 bg-zinc-800" />
              )}
              <div>
                <p className="text-sm text-zinc-200">{creatorName || "Creator"}</p>
                <p className="text-[11px] text-zinc-500">{wallet ? "Wallet verified" : "Wallet not linked"}</p>
              </div>
            </div>

            <h3 className="mt-4 text-base font-semibold text-white">{values.title || "Untitled listing"}</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {values.shortPitch || "Your short pitch will appear here."}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {links.length > 0 ? (
                links.map((l) => (
                  <span key={l.label} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-zinc-300">
                    {l.label}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-zinc-600">No community links yet</span>
              )}
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-zinc-500">
              <p>Type: <span className="text-zinc-300">{values.groupType}</span></p>
              <p className="mt-1">Access: <span className="text-zinc-300">{values.accessType}</span></p>
              <p className="mt-1">Price: <span className="text-zinc-300">{values.accessType === "PAID" ? `$${values.priceUsd ?? 0}` : "Free"}</span></p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
