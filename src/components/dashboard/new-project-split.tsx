"use client";

import { DecimalPriceInput } from "@/components/decimal-price-input";
import { PriceOptionsField } from "@/components/price-options-field";
import { ProjectDetailImagesField } from "@/components/project-detail-images-field";
import { TELEGRAM_GROUP_BOT_UI, TELEGRAM_GROUP_ID_FORM_UI } from "@/lib/feature-flags";
import { normalizeProjectForm, projectFormSchema, type ProjectForm } from "@/lib/project-schema";
import { uploadCommunityLogoFile } from "@/lib/upload-community-client";
import { resultToPanelMessage, runPhantomConnectFlow } from "@/lib/solana-phantom-connect";
import { useWallet } from "@solana/wallet-adapter-react";
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
  priceCurrency: "SOL",
  category: "",
  rules: "",
  deliveryPolicy: "",
  communityImage: "",
  detailImages: [] as string[],
  telegram: "",
  discord: "",
  telegramGroupChatId: "",
  published: false,
  priceOptions: [] as NonNullable<import("@/lib/project-schema").ProjectForm["priceOptions"]>,
};

const field =
  "mt-0.5 w-full rounded-md border border-white/10 bg-zinc-900 px-1.5 py-1.5 text-sm leading-snug text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none sm:px-2 sm:py-1.5";
const label = "text-xs font-medium uppercase tracking-wide text-zinc-500";

type Props = {
  creatorName: string | null;
  creatorImage: string | null;
  wallet: string | null;
};

function formatPreviewPrice(v: ProjectForm) {
  if (v.groupType === "PUBLIC") return null;
  if (v.accessType !== "PAID") return "Free";
  const cur = "SOL";
  const line = (amount: number) => {
    if (cur === "SOL") {
      const s = amount % 1 === 0 ? String(amount) : amount.toFixed(4).replace(/\.?0+$/, "");
      return `${s} SOL`;
    }
    return `${amount.toFixed(4).replace(/\.?0+$/, "")} SOL`;
  };
  const opts = (v.priceOptions ?? []).filter((o) => o.label.trim().length > 0 && o.priceAmount > 0);
  if (opts.length > 1) {
    const min = Math.min(...opts.map((o) => o.priceAmount));
    return `from ${line(min)}`;
  }
  if (opts.length === 1) {
    return line(opts[0].priceAmount);
  }
  return line(v.priceAmount ?? 0);
}

export function NewProjectSplit({ creatorName, creatorImage, wallet }: Props) {
  const router = useRouter();
  const { connected, connect, connecting, wallet: selectedWallet, wallets, select } = useWallet();
  const [values, setValues] = useState<ProjectForm>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [communityImageFile, setCommunityImageFile] = useState<File | null>(null);
  const [communityImagePreview, setCommunityImagePreview] = useState<string | null>(null);
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
  const hasAccessTiers = showPrice && (values.priceOptions?.length ?? 0) > 0;
  const previewPrice = formatPreviewPrice(values);
  const communityImageSrc = communityImagePreview ?? values.communityImage ?? "";
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
      let payload = normalizeProjectForm(parsed.data);
      if (communityImageFile) {
        const imageUrl = await uploadCommunityLogoFile(communityImageFile);
        payload = { ...payload, communityImage: imageUrl };
      }
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: unknown };
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to create project",
        );
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onConnectWallet() {
    const result = await runPhantomConnectFlow({
      wallet: selectedWallet,
      wallets,
      select,
      connect,
    });
    if (result.kind !== "connected") {
      setError(
        resultToPanelMessage(result, {
          selected: "Phantom selected. Click connect once more.",
        }) ?? "Failed to connect wallet.",
      );
      return;
    }
    setError(null);
  }

  if (!connected) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-amber-200/90 sm:text-base">Connect wallet first</h2>
        <p className="mt-1 text-xs leading-relaxed text-amber-200/80 sm:text-sm">
          You must connect your Solana wallet before creating a new listing.
        </p>
        {error ? <p className="mt-2 text-xs text-rose-200/90 sm:text-sm">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onConnectWallet()}
            disabled={connecting}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black disabled:opacity-60"
          >
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-300"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-10 lg:items-start">
      <form onSubmit={onSubmit} className="space-y-3 lg:col-span-7">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/85">
          <div className="border-b border-white/10 px-3 py-2 sm:px-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-sm">Call details</h2>
            <p className="mt-0.5 text-xs text-zinc-600 sm:text-sm">Form on the left, live preview on the right.</p>
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
              <p className="mb-1 text-xs text-zinc-600 sm:text-sm">PNG, JPEG, WebP, or GIF — max 2MB. Shown on explore cards.</p>
              <div className="flex flex-wrap items-center gap-2">
                {communityImageSrc ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={communityImageSrc}
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
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (!f) return;
                    setError(null);
                    setCommunityImageFile(f);
                    setCommunityImagePreview(URL.createObjectURL(f));
                    set("communityImage", "");
                  }}
                  className="w-full min-w-0 text-xs text-zinc-500 file:me-1.5 file:rounded file:border-0 file:bg-zinc-800 file:px-1.5 file:py-1 file:text-zinc-200"
                />
                {communityImageSrc ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCommunityImageFile(null);
                      setCommunityImagePreview(null);
                      set("communityImage", "");
                    }}
                    className="shrink-0 rounded border border-white/15 px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Remove
                  </button>
                ) : null}
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-sm">Access &amp; price</h2>
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
              <p className="text-xs text-zinc-500 sm:col-span-2">Public listings are free. Price applies to private paid calls only.</p>
            )}
            {showPrice && (values.priceOptions?.length ?? 0) === 0 && (
              <>
                <div>
                  <label className={label}>Price</label>
                  <DecimalPriceInput
                    value={values.priceAmount}
                    onValueChange={(n) => set("priceAmount", n)}
                    className={field}
                    placeholder="e.g. 0.002, 1.5"
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
                    <option value="SOL">SOL</option>
                  </select>
                </div>
              </>
            )}
            {showPrice && (values.priceOptions?.length ?? 0) > 0 && (
              <div className="sm:col-span-2">
                <label className={label}>Currency (all tiers)</label>
                <select
                  value={values.priceCurrency}
                  onChange={(e) => set("priceCurrency", e.target.value as ProjectForm["priceCurrency"])}
                  className={field}
                >
                  <option value="SOL">SOL</option>
                </select>
              </div>
            )}
            {showPrice && (
              <div className="sm:col-span-2">
                <label className={label}>Access tiers (optional)</label>
                <PriceOptionsField
                  value={values.priceOptions ?? []}
                  onChange={(rows) => set("priceOptions", rows)}
                  priceCurrency={values.priceCurrency}
                  onCurrencyChange={(c) => set("priceCurrency", c)}
                  showCurrency={false}
                />
              </div>
            )}
            {showPrice && !hasAccessTiers && (
              <div className="sm:col-span-2">
                <label className={label}>Telegram invite (optional)</label>
                <p className="mb-1 text-xs text-zinc-600 sm:text-sm">
                  {TELEGRAM_GROUP_BOT_UI
                    ? "Create the listing, then on Edit use “Open verification in Telegram” to auto-fill the invite and group id (optional)."
                    : "t.me invite for buyers. You can set it on this step or on Edit after save."}
                </p>
                <input
                  value={values.telegram ?? ""}
                  onChange={(e) => set("telegram", e.target.value)}
                  className={field}
                  placeholder={
                    TELEGRAM_GROUP_BOT_UI
                      ? "https://t.me/+… (can auto in edit with bot)"
                      : "https://t.me/+…"
                  }
                />
              </div>
            )}
            {showPrice && hasAccessTiers && (
              <div className="sm:col-span-2">
                <p className="text-xs text-zinc-500">
                  <span className="text-zinc-400">With tiers:</span> set <strong>Telegram (tier)</strong> on each row.
                  {TELEGRAM_GROUP_BOT_UI
                    ? " For default link + group id, create the listing, then on Edit use bot verification."
                    : " Set the default invite and group id on Edit after you save."}
                </p>
              </div>
            )}
            {showPrice && TELEGRAM_GROUP_ID_FORM_UI && (
              <div className="sm:col-span-2">
                <label className={label}>Telegram group id (optional)</label>
                <p className="mb-1 text-xs text-zinc-600 sm:text-sm">
                  {TELEGRAM_GROUP_BOT_UI
                    ? "From bot verification or paste manually (e.g. -100…, @RawDataBot)."
                    : "Supergroup id (e.g. -100…). Get it from a bot in the group (e.g. @RawDataBot) or your client."}
                </p>
                <input
                  value={values.telegramGroupChatId ?? ""}
                  onChange={(e) => set("telegramGroupChatId", e.target.value)}
                  className={`${field} max-w-md font-mono`}
                  placeholder="-1001234567890"
                  inputMode="numeric"
                />
              </div>
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
          {hasAccessTiers && (
            <div className="space-y-2.5 border-t border-white/10 p-3 sm:p-3.5">
              <label className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={!!values.published}
                  onChange={(e) => set("published", e.target.checked)}
                  className="h-3 w-3 rounded border-white/20"
                />
                Publish in directory
              </label>
              {error && (
                <div className="rounded-md border border-rose-400/30 bg-rose-950/25 px-2.5 py-1.5 text-sm text-rose-200">
                  {error}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-black disabled:opacity-60 sm:px-2.5"
                >
                  {submitting ? "Saving…" : "Create listing"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="rounded-md border border-white/15 px-2.5 py-1.5 text-sm text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!hasAccessTiers && (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/85">
            <div className="border-b border-white/10 px-3 py-2 sm:px-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-sm">Links &amp; publish</h2>
              <p className="mt-0.5 text-xs text-zinc-600">
                {showPrice
                  ? "Use Discord here. For Telegram, use the paid / VIP block above."
                  : "At least one: Telegram or Discord."}
              </p>
            </div>
            <div className="space-y-2.5 p-3 sm:p-3.5">
              {showPrice ? null : (
                <div>
                  <span className={label}>Telegram</span>
                  <input
                    value={values.telegram}
                    onChange={(e) => set("telegram", e.target.value)}
                    className={field}
                    placeholder="https://t.me/… (public t.me/yourgroup)"
                  />
                </div>
              )}
              <div>
                <span className={label}>Discord</span>
                <input
                  value={values.discord ?? ""}
                  onChange={(e) => set("discord", e.target.value)}
                  className={field}
                  placeholder="https://discord.gg/…"
                />
              </div>

              <label className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={!!values.published}
                  onChange={(e) => set("published", e.target.checked)}
                  className="h-3 w-3 rounded border-white/20"
                />
                Publish in directory
              </label>

              {error && (
                <div className="rounded-md border border-rose-400/30 bg-rose-950/25 px-2.5 py-1.5 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-black disabled:opacity-60 sm:px-2.5"
                >
                  {submitting ? "Saving…" : "Create listing"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="rounded-md border border-white/15 px-2.5 py-1.5 text-sm text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      <aside className="lg:col-span-3">
        <div className="lg:sticky lg:top-20">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90">
            <div className="border-b border-white/10 px-3 py-2 sm:px-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-sm">Preview</h2>
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
                    <p className="truncate text-sm font-medium text-zinc-200">{creatorName || "Operator"}</p>
                    <p className="text-xs text-zinc-500">{wallet ? "Wallet ok" : "No wallet"}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2.5">
                  {communityImageSrc ? (
                    <Image
                      src={communityImageSrc}
                      width={40}
                      height={40}
                      unoptimized
                      className="mt-0.5 h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-sm font-semibold text-zinc-200">
                      {titleInitial}
                    </div>
                  )}
                  <h3 className="min-w-0 flex-1 text-xs font-semibold text-white sm:text-sm">
                    {values.title || "Untitled"}
                  </h3>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">
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
                      <span key={l.label} className="rounded border border-white/10 px-1.5 py-0.5 text-xs text-zinc-400">
                        {l.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-600">No links yet</span>
                  )}
                </div>

                <dl className="mt-2.5 space-y-1 border-t border-white/10 pt-2.5 text-xs text-zinc-500 sm:text-sm">
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
