"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project } from "@prisma/client";
import { projectFormSchema, type ProjectForm, normalizeProjectForm } from "@/lib/project-schema";
import { parseDetailImagesJson } from "@/lib/project-detail-images";
import { ProjectDetailImagesField } from "@/components/project-detail-images-field";
import { uploadCommunityLogoFile } from "@/lib/upload-community-client";
import Image from "next/image";

const empty: ProjectForm = {
  title: "",
  shortPitch: "",
  description: "",
  groupType: "PUBLIC",
  accessType: "FREE",
  priceAmount: undefined,
  priceCurrency: "USDC",
  category: "",
  rules: "",
  deliveryPolicy: "",
  communityImage: "",
  detailImages: [] as string[],
  telegram: "",
  discord: "",
  published: false,
};

type Props = {
  mode: "create" | "edit";
  project?: Project;
};

export function ProjectForm({ mode, project }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectForm>(() => ({
    ...empty,
    ...(project
      ? {
          title: project.title,
          shortPitch: project.shortPitch,
          description: project.description,
          groupType: (project.groupType as "PUBLIC" | "PRIVATE") ?? "PUBLIC",
          accessType: (project.accessType as "FREE" | "PAID") ?? "FREE",
          priceAmount: project.priceAmount ?? undefined,
          priceCurrency: (project.priceCurrency === "SOL" ? "SOL" : "USDC") as ProjectForm["priceCurrency"],
          category: project.category ?? "",
          rules: project.rules,
          deliveryPolicy: project.deliveryPolicy,
          communityImage: project.communityImage ?? "",
          detailImages: parseDetailImagesJson(project.detailImages),
          telegram: project.telegram ?? "",
          discord: project.discord ?? "",
          published: project.published,
        }
      : {}),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldLabel: Record<string, string> = {
    title: "Call name",
    shortPitch: "Pitch",
    description: "Call summary",
    groupType: "Group type",
    accessType: "Access type",
    priceAmount: "Price",
    priceCurrency: "Currency",
    category: "Category",
    rules: "Rules",
    deliveryPolicy: "Delivery policy",
    communityImage: "Community logo",
    detailImages: "Detail images",
    telegram: "Telegram link",
    discord: "Discord link",
  };

  const set = <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) => {
    setValues((p) => {
      const next = { ...p, [k]: v } as ProjectForm;
      if (k === "groupType" && v === "PUBLIC") {
        next.accessType = "FREE";
      }
      return next;
    });
  };

  const showPrice = values.groupType === "PRIVATE" && values.accessType === "PAID";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const parsed = projectFormSchema.safeParse({
      ...values,
      communityImage: values.communityImage || undefined,
      detailImages: values.detailImages ?? [],
      discord: values.discord || undefined,
    });

    if (!parsed.success) {
      const { fieldErrors } = parsed.error.flatten();
      const lines = Object.entries(fieldErrors)
        .filter(([, msgs]) => msgs && msgs.length > 0)
        .map(([k, msgs]) => `${fieldLabel[k] ?? k}: ${msgs?.[0]}`);
      setError(
        lines.length > 0
          ? `Please fix these fields - ${lines.join(" | ")}`
          : "Please check your inputs. Required fields need enough detail, and optional links must be valid URLs.",
      );
      setSubmitting(false);
      return;
    }

    const body = normalizeProjectForm(parsed.data);

    try {
      if (mode === "create") {
        const r = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: unknown };
          throw new Error(typeof j.error === "string" ? j.error : "Failed to create project");
        }
        await router.push("/dashboard");
        router.refresh();
        return;
      }

      if (!project) return;
      const r = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed to update project");
      await router.push("/dashboard");
      router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-zinc-950 p-3 sm:p-3.5">
        <h2 className="text-xs font-semibold text-white">Core information</h2>
        <p className="mt-0.5 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">
          Describe your community call clearly and credibly.
        </p>

        <div className="mt-3 space-y-3.5">
          <div>
            <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Call name</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Alpha Hunters VIP"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Pitch</label>
            <textarea
              className="mt-1.5 min-h-[72px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.shortPitch}
              onChange={(e) => set("shortPitch", e.target.value)}
              placeholder="A short one-paragraph description of your narrative and target community."
            />
          </div>

          <div>
            <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">
              Call summary (optional)
            </label>
            <textarea
              className="mt-1.5 min-h-[120px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Longer text if you need it — you can leave this empty."
            />
          </div>

          <div>
            <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Community logo</label>
            <p className="mt-0.5 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">
              PNG, JPEG, WebP, or GIF — max 2MB. Shown on directory cards.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {values.communityImage ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                  <Image
                    src={values.communityImage}
                    alt="Community"
                    width={48}
                    height={48}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-zinc-900/50 text-[9px] text-zinc-600">
                  No logo
                </div>
              )}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={logoUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (!f) return;
                    setLogoUploading(true);
                    setError(null);
                    try {
                      const url = await uploadCommunityLogoFile(f);
                      set("communityImage", url);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Upload failed");
                    } finally {
                      setLogoUploading(false);
                    }
                  }}
                  className="w-full max-w-xs text-[9px] text-zinc-400 file:me-1.5 file:rounded file:border-0 file:bg-zinc-800 file:px-1.5 file:py-1 file:text-[10px] file:text-zinc-200"
                />
                {values.communityImage ? (
                  <button
                    type="button"
                    onClick={() => set("communityImage", "")}
                    className="rounded border border-white/15 px-2 py-1 text-[10px] text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
                  >
                    Remove logo
                  </button>
                ) : null}
                {logoUploading ? <span className="text-[9px] text-zinc-500">Uploading…</span> : null}
              </div>
            </div>
          </div>

          <div className="pt-0.5">
            <ProjectDetailImagesField
              images={values.detailImages}
              onChange={(next) => set("detailImages", next)}
              helpText="Shots of your product, group, or community — shown on the public listing page."
              labelClass="block text-[9px] font-medium uppercase tracking-widest text-zinc-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-950 p-3 sm:p-3.5">
        <h2 className="text-xs font-semibold text-white">Community links</h2>
        <p className="mt-0.5 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">Use at least one valid link: Telegram or Discord.</p>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-1">
          {([
            ["telegram", "Telegram"] as const,
            ["discord", "Discord"] as const,
          ] as const).map(([key, plabel]) => (
            <div key={key}>
              <label className="text-[9px] font-medium uppercase tracking-widest text-zinc-500">{plabel}</label>
              <input
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                value={String(values[key] ?? "")}
                onChange={(e) => set(key, e.target.value)}
                placeholder="https://..."
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-950 p-3 sm:p-3.5">
        <h2 className="text-xs font-semibold text-white">Access and delivery</h2>
        <p className="mt-0.5 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">
          Configure public/private access and pricing.
        </p>

        <div className="mt-3 space-y-3.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Call type</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 focus:border-white/30 focus:outline-none"
                value={values.groupType}
                onChange={(e) => set("groupType", e.target.value as ProjectForm["groupType"])}
              >
                <option value="PUBLIC">Public call</option>
                <option value="PRIVATE">Private call</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Access mode</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                value={values.accessType}
                onChange={(e) => set("accessType", e.target.value as ProjectForm["accessType"])}
                disabled={values.groupType === "PUBLIC"}
              >
                <option value="FREE">Free/Open</option>
                <option value="PAID">Paid/VIP</option>
              </select>
            </div>
          </div>
          {values.groupType === "PUBLIC" && (
            <p className="text-[9px] leading-snug text-zinc-500 sm:text-[10px]">
              Public calls are free. Price and currency apply only to private paid listings.
            </p>
          )}
          {showPrice && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Price</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                  value={values.priceAmount ?? ""}
                  onChange={(e) => set("priceAmount", e.target.value === "" ? undefined : Number(e.target.value))}
                  placeholder="e.g. 10"
                />
              </div>
              <div>
                <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Currency</label>
                <select
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 focus:border-white/30 focus:outline-none"
                  value={values.priceCurrency}
                  onChange={(e) => set("priceCurrency", e.target.value as ProjectForm["priceCurrency"])}
                >
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Category</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 focus:border-white/30 focus:outline-none"
              value={values.category ?? ""}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Airdrop / Calls / Education"
            />
          </div>
          <div>
            <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Call rules</label>
            <textarea
              className="mt-1.5 min-h-[140px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.rules}
              onChange={(e) => set("rules", e.target.value)}
              placeholder="Member rules, banned actions, and expectations."
            />
          </div>

          <div>
            <label className="block text-[9px] font-medium uppercase tracking-widest text-zinc-500">Access delivery policy</label>
            <textarea
              className="mt-1.5 min-h-[100px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.deliveryPolicy}
              onChange={(e) => set("deliveryPolicy", e.target.value)}
              placeholder="How you provide invite access after payment."
            />
          </div>

          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] text-zinc-300">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 shrink-0 rounded border-white/20"
              checked={!!values.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            Show this listing in public directory
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-400/20 bg-rose-950/30 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-rose-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 pb-6">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-white px-3 py-1.5 text-[10px] sm:text-[11px] font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {submitting ? "Saving..." : mode === "create" ? "Create listing" : "Update listing"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-white/15 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-zinc-300 transition hover:border-white/30"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
