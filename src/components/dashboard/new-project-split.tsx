"use client";

import { ProjectDetailImagesField } from "@/components/project-detail-images-field";
import { normalizeProjectForm, projectFormSchema, type ProjectForm } from "@/lib/project-schema";
import { uploadCommunityLogoFile } from "@/lib/upload-community-client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const initialValues: ProjectForm = {
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

const field =
  "mt-0.5 w-full rounded-md border border-white/10 bg-zinc-900 px-1.5 py-1 text-[10px] leading-snug text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none sm:px-2 sm:py-1.5 sm:text-[11px]";
const label = "text-[9px] font-medium uppercase tracking-wide text-zinc-500";

type Props = {
  creatorName: string | null;
  creatorImage: string | null;
  wallet: string | null;
};

function formatPreviewPrice(v: ProjectForm) {
  if (v.groupType === "PUBLIC") return null;
  if (v.accessType !== "PAID") return "Free";
  const a = v.priceAmount ?? 0;
  if (v.priceCurrency === "SOL") {
    const s = a % 1 === 0 ? String(a) : a.toFixed(4).replace(/\.?0+$/, "");
    return `${s} SOL`;
  }
  return `${a.toFixed(2)} USDC`;
}

export function NewProjectSplit({ creatorName, creatorImage, wallet }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectForm>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const links = useMemo(
    () =>
      [
        { label: "Telegram", value: values.telegram },
        { label: "Discord", value: values.discord },
      ].filter((l) => l.value && l.value.trim().length > 0),
    [values.telegram, values.discord],
  );

  const set = <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) => {
    setValues((prev) => {
      const next = { ...prev, [k]: v } as ProjectForm;
      if (k === "groupType" && v === "PUBLIC") {
        next.accessType = "FREE";
      }
      return next;
    });
  };

  const showPrice = values.groupType === "PRIVATE" && values.accessType === "PAID";
  const previewPrice = formatPreviewPrice(values);
  const titleInitial = useMemo(
    () => (values.title.trim().charAt(0) || "C").toUpperCase(),
    [values.title],
  );

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
    <div className="grid gap-3 lg:grid-cols-10 lg:items-start">
      <form onSubmit={onSubmit} className="space-y-3 lg:col-span-7">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/85">
          <div className="border-b border-white/10 px-3 py-2 sm:px-3.5">
            <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Call details</h2>
            <p className="mt-0.5 text-[9px] text-zinc-600 sm:text-[10px]">Form on the left, live preview on the right.</p>
          </div>
          <div className="space-y-3 p-3 sm:p-3.5">
            <div>
              <label className={label}>Name</label>
              <input
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                className={field}
                placeholder="e.g. Solana Insider Club"
              />
            </div>

            <div>
              <label className={label}>Pitch</label>
              <textarea
                value={values.shortPitch}
                onChange={(e) => set("shortPitch", e.target.value)}
                className={`${field} min-h-[64px]`}
                placeholder="One line pitch."
              />
            </div>

            <div>
              <label className={label}>Description (optional)</label>
              <textarea
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                className={`${field} min-h-[80px] sm:min-h-[88px]`}
                placeholder="Longer context if you want — you can leave this empty."
              />
            </div>
            <div>
              <label className={label}>Community logo</label>
              <p className="mb-1 text-[9px] text-zinc-600 sm:text-[10px]">PNG, JPEG, WebP, or GIF — max 2MB. Shown on explore cards.</p>
              <div className="flex flex-wrap items-center gap-2">
                {values.communityImage ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={values.communityImage}
                      alt=""
                      width={44}
                      height={44}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
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
                  className="w-full min-w-0 text-[9px] text-zinc-500 file:me-1.5 file:rounded file:border-0 file:bg-zinc-800 file:px-1.5 file:py-1 file:text-zinc-200"
                />
                {values.communityImage ? (
                  <button
                    type="button"
                    onClick={() => set("communityImage", "")}
                    className="shrink-0 rounded border border-white/15 px-1.5 py-1 text-[9px] text-zinc-500 hover:text-zinc-300"
                  >
                    Remove
                  </button>
                ) : null}
                {logoUploading ? <span className="text-[9px] text-zinc-500">…</span> : null}
              </div>
            </div>
            <ProjectDetailImagesField
              compact
              images={values.detailImages}
              onChange={(next) => set("detailImages", next)}
              helpText="Shots of your product or community. Shown on the listing page."
              labelClass={label}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/85">
          <div className="border-b border-white/10 px-3 py-2 sm:px-3.5">
            <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Access &amp; price</h2>
          </div>
          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:gap-2.5 sm:p-3.5">
            <div>
              <label className={label}>Call type</label>
              <select
                value={values.groupType}
                onChange={(e) => set("groupType", e.target.value as ProjectForm["groupType"])}
                className={field}
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
            <div>
              <label className={label}>Access</label>
              <select
                value={values.accessType}
                onChange={(e) => set("accessType", e.target.value as ProjectForm["accessType"])}
                className={`${field} disabled:cursor-not-allowed disabled:opacity-45 disabled:ring-0`}
                disabled={values.groupType === "PUBLIC"}
              >
                <option value="FREE">Open / free</option>
                <option value="PAID">Paid / VIP</option>
              </select>
            </div>
            {values.groupType === "PUBLIC" && (
              <p className="text-[9px] text-zinc-500 sm:col-span-2">Public listings are free. Price applies to private paid calls only.</p>
            )}
            {showPrice && (
              <>
                <div>
                  <label className={label}>Price</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={values.priceAmount ?? ""}
                    onChange={(e) => set("priceAmount", e.target.value === "" ? undefined : Number(e.target.value))}
                    className={field}
                    placeholder="Amount"
                  />
                </div>
                <div>
                  <label className={label}>Currency</label>
                  <select
                    value={values.priceCurrency}
                    onChange={(e) =>
                      set("priceCurrency", e.target.value as ProjectForm["priceCurrency"])
                    }
                    className={field}
                  >
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className={label}>Category</label>
              <input
                value={values.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
                className={field}
                placeholder="e.g. Alpha"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Rules</label>
              <textarea
                value={values.rules}
                onChange={(e) => set("rules", e.target.value)}
                className={`${field} min-h-[80px] sm:min-h-[92px]`}
                placeholder="House rules for the room."
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>How access is delivered</label>
              <textarea
                value={values.deliveryPolicy}
                onChange={(e) => set("deliveryPolicy", e.target.value)}
                className={`${field} min-h-[64px]`}
                placeholder="What happens after payment, response time, etc."
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/85">
          <div className="border-b border-white/10 px-3 py-2 sm:px-3.5">
            <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Links &amp; publish</h2>
            <p className="mt-0.5 text-[9px] text-zinc-600">At least one: Telegram or Discord.</p>
          </div>
          <div className="space-y-2.5 p-3 sm:p-3.5">
            <div>
              <span className={label}>Telegram</span>
              <input
                value={values.telegram}
                onChange={(e) => set("telegram", e.target.value)}
                className={field}
                placeholder="https://t.me/… (public t.me/yourgroup)"
              />
            </div>
            <div>
              <span className={label}>Discord</span>
              <input
                value={values.discord ?? ""}
                onChange={(e) => set("discord", e.target.value)}
                className={field}
                placeholder="https://discord.gg/…"
              />
            </div>

            <label className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-400">
              <input
                type="checkbox"
                checked={!!values.published}
                onChange={(e) => set("published", e.target.checked)}
                className="h-3 w-3 rounded border-white/20"
              />
              Publish in directory
            </label>

            {error && (
              <div className="rounded-md border border-rose-400/30 bg-rose-950/25 px-2.5 py-1.5 text-[10px] text-rose-200 sm:text-[11px]">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-white px-2.5 py-1 text-[10px] font-medium text-black disabled:opacity-60 sm:px-2.5"
              >
                {submitting ? "Saving…" : "Create listing"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-md border border-white/15 px-2.5 py-1 text-[10px] text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>

      <aside className="lg:col-span-3">
        <div className="lg:sticky lg:top-20">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90">
            <div className="border-b border-white/10 px-3 py-2 sm:px-3.5">
              <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Preview</h2>
            </div>
            <div className="p-3 sm:p-3.5">
              <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3">
                <div className="flex items-center gap-2.5">
                  {creatorImage ? (
                    <Image
                      src={creatorImage}
                      alt={creatorName || "Operator"}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full border border-white/10 bg-zinc-800" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium text-zinc-200">{creatorName || "Operator"}</p>
                    <p className="text-[9px] text-zinc-500">{wallet ? "Wallet ok" : "No wallet"}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2.5">
                  {values.communityImage ? (
                    <Image
                      src={values.communityImage}
                      width={40}
                      height={40}
                      unoptimized
                      className="mt-0.5 h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-[10px] font-semibold text-zinc-200">
                      {titleInitial}
                    </div>
                  )}
                  <h3 className="min-w-0 flex-1 text-xs font-semibold text-white sm:text-sm">
                    {values.title || "Untitled"}
                  </h3>
                </div>
                <p className="mt-1.5 text-[9px] leading-relaxed text-zinc-500 sm:text-[10px]">
                  {values.shortPitch || "Pitch preview…"}
                </p>

                {values.detailImages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {values.detailImages.map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10"
                      >
                        <Image
                          src={src}
                          alt=""
                          width={48}
                          height={48}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {links.length > 0 ? (
                    links.map((l) => (
                      <span key={l.label} className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400">
                        {l.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-zinc-600">No links yet</span>
                  )}
                </div>

                <dl className="mt-2.5 space-y-1 border-t border-white/10 pt-2.5 text-[9px] text-zinc-500 sm:text-[10px]">
                  <div className="flex justify-between gap-2">
                    <dt>Type</dt>
                    <dd className="text-zinc-300">{values.groupType}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Access</dt>
                    <dd className="text-zinc-300">{values.accessType}</dd>
                  </div>
                  {values.groupType !== "PUBLIC" && (
                    <div className="flex justify-between gap-2">
                      <dt>Price</dt>
                      <dd className="text-zinc-300">{previewPrice}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
