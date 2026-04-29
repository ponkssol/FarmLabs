"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project } from "@prisma/client";
import { projectFormSchema, type ProjectForm, normalizeProjectForm } from "@/lib/project-schema";
import { parseDetailImagesJson } from "@/lib/project-detail-images";
import { TELEGRAM_GROUP_BOT_UI, TELEGRAM_GROUP_ID_FORM_UI } from "@/lib/feature-flags";
import { DecimalPriceInput } from "@/components/decimal-price-input";
import { PriceOptionsField } from "@/components/price-options-field";
import { ProjectDetailImagesField } from "@/components/project-detail-images-field";
import {
  ProjectTelegramGroupSetup,
  type TelegramVipSyncPayload,
} from "@/components/project-telegram-group-setup";
import Image from "next/image";

const empty: ProjectForm = {
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

type EditableProject = Project & {
  telegramGroupTitle?: string | null;
  priceOptions?: {
    id: string;
    label: string;
    priceAmount: number;
    sortOrder: number;
    telegramUrl: string | null;
    discordUrl: string | null;
    accessDurationDays: number | null;
    discordRoleId: string | null;
  }[];
};

type Props = {
  mode: "create" | "edit";
  project?: EditableProject;
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
          priceCurrency: "SOL" as ProjectForm["priceCurrency"],
          category: project.category ?? "",
          rules: project.rules,
          deliveryPolicy: project.deliveryPolicy,
          communityImage: project.communityImage ?? "",
          detailImages: parseDetailImagesJson(project.detailImages),
          telegram: project.telegram ?? "",
          discord: project.discord ?? "",
          telegramGroupChatId: (project as { telegramGroupChatId?: string | null }).telegramGroupChatId ?? "",
          published: project.published,
          priceOptions:
            project.priceOptions?.map((o) => ({
              id: o.id,
              label: o.label,
              priceAmount: o.priceAmount,
              sortOrder: o.sortOrder,
              telegramUrl: o.telegramUrl ?? undefined,
              discordUrl: o.discordUrl ?? undefined,
              accessDurationDays: o.accessDurationDays ?? undefined,
              discordRoleId: o.discordRoleId ?? undefined,
            })) ?? [],
        }
      : {}),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [communityImageFile, setCommunityImageFile] = useState<File | null>(null);
  const [communityImagePreview, setCommunityImagePreview] = useState<string | null>(null);
  const communityImageSrc = communityImagePreview ?? values.communityImage ?? "";
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
    telegramGroupChatId: "Telegram group chat id",
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
  const hasAccessTiers = showPrice && (values.priceOptions?.length ?? 0) > 0;

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
        const r = communityImageFile
          ? await (async () => {
              const fd = new FormData();
              fd.set("payload", JSON.stringify(body));
              fd.set("communityImageFile", communityImageFile);
              return fetch("/api/projects", { method: "POST", body: fd });
            })()
          : await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
        const created = (await r.json().catch(() => ({}))) as {
          id?: string;
          error?: unknown;
          details?: string;
        };
        if (!r.ok) {
          const msg =
            typeof created.error === "string"
              ? created.error
              : "Failed to create project";
          throw new Error(created.details ? `${msg} (${created.details})` : msg);
        }
        if (created.id) {
          await router.push(`/dashboard/edit/${created.id}`);
        } else {
          await router.push("/dashboard");
        }
        router.refresh();
        return;
      }

      if (!project) return;
      const r = communityImageFile
        ? await (async () => {
            const fd = new FormData();
            fd.set("payload", JSON.stringify(body));
            fd.set("communityImageFile", communityImageFile);
            return fetch(`/api/projects/${project.id}`, { method: "PATCH", body: fd });
          })()
        : await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!r.ok) throw new Error("Failed to update project");
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
        <h2 className="ui-form-section-title">Core information</h2>
        <p className="mt-0.5 ui-form-hint">
          Describe your community call clearly and credibly.
        </p>

        <div className="mt-3 space-y-3.5">
          <div>
            <label className="ui-form-label">Call name</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Alpha Hunters VIP"
              required
            />
          </div>

          <div>
            <label className="ui-form-label">Pitch</label>
            <textarea
              className="mt-1.5 min-h-[72px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.shortPitch}
              onChange={(e) => set("shortPitch", e.target.value)}
              placeholder="A short one-paragraph description of your narrative and target community."
            />
          </div>

          <div>
            <label className="ui-form-label">
              Call summary (optional)
            </label>
            <textarea
              className="mt-1.5 min-h-[120px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Longer text if you need it — you can leave this empty."
            />
          </div>

          <div>
            <label className="ui-form-label">Community logo</label>
            <p className="mt-0.5 ui-form-hint">
              PNG, JPEG, WebP, or GIF — max 2MB. Shown on directory cards.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {communityImageSrc ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                  <Image
                    src={communityImageSrc}
                    alt="Community"
                    width={48}
                    height={48}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 bg-zinc-900/50 text-xs text-zinc-600">
                  No logo
                </div>
              )}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
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
                  className="w-full max-w-xs text-xs text-zinc-400 file:me-1.5 file:rounded file:border-0 file:bg-zinc-800 file:px-1.5 file:py-1 file:text-xs file:text-zinc-200"
                />
                {communityImageSrc ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCommunityImageFile(null);
                      setCommunityImagePreview(null);
                      set("communityImage", "");
                    }}
                    className="rounded border border-white/15 px-2 py-1 text-sm text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
                  >
                    Remove logo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="pt-0.5">
            <ProjectDetailImagesField
              images={values.detailImages}
              onChange={(next) => set("detailImages", next)}
              helpText="Shots of your product, group, or community — shown on the public listing page."
              labelClass="ui-form-label"
            />
          </div>
        </div>
      </section>

      {!hasAccessTiers && (
        <section className="rounded-xl border border-white/10 bg-zinc-950 p-3 sm:p-3.5">
          <h2 className="ui-form-section-title">Community links</h2>
          <p className="mt-0.5 ui-form-hint">
            {showPrice
              ? TELEGRAM_GROUP_BOT_UI
                ? "Use Discord here. For Telegram, use the “Access and delivery” section (VIP invite + optional bot verification)."
                : "Use Discord here. For Telegram, use “Access and delivery” (manual VIP invite and group id)."
              : "Use at least one valid link: Telegram or Discord."}
          </p>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-1">
            {(
              showPrice
                ? (["discord"] as const)
                : (["telegram", "discord"] as const)
            ).map((key) => {
              const plabel = key === "telegram" ? "Telegram" : "Discord";
              return (
                <div key={key}>
                  <label className="ui-form-label">{plabel}</label>
                  <input
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                    value={String(values[key] ?? "")}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-zinc-950 p-3 sm:p-3.5">
        <h2 className="ui-form-section-title">Access and delivery</h2>
        <p className="mt-0.5 ui-form-hint">
          Configure public/private access and pricing.
        </p>

        <div className="mt-3 space-y-3.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className="ui-form-label">Call type</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-white/30 focus:outline-none"
                value={values.groupType}
                onChange={(e) => set("groupType", e.target.value as ProjectForm["groupType"])}
              >
                <option value="PUBLIC">Public call</option>
                <option value="PRIVATE">Private call</option>
              </select>
            </div>
            <div>
              <label className="ui-form-label">Access mode</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
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
            <p className="ui-form-hint">
              Public calls are free. Price and currency apply only to private paid listings.
            </p>
          )}
          {showPrice && (values.priceOptions?.length ?? 0) === 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="ui-form-label">Price</label>
                <DecimalPriceInput
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                  value={values.priceAmount}
                  onValueChange={(n) => set("priceAmount", n)}
                  placeholder="e.g. 0.002, 1.5"
                />
              </div>
              <div>
                <label className="ui-form-label">Currency</label>
                <select
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-white/30 focus:outline-none"
                  value={values.priceCurrency}
                  onChange={(e) => set("priceCurrency", e.target.value as ProjectForm["priceCurrency"])}
                >
                  <option value="SOL">SOL</option>
                </select>
              </div>
            </div>
          )}
          {showPrice && (values.priceOptions?.length ?? 0) > 0 && (
            <div>
              <label className="ui-form-label">
                Currency (all tiers)
              </label>
              <select
                className="mt-1.5 w-full max-w-sm rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-white/30 focus:outline-none"
                value={values.priceCurrency}
                onChange={(e) => set("priceCurrency", e.target.value as ProjectForm["priceCurrency"])}
              >
                <option value="SOL">SOL</option>
              </select>
            </div>
          )}
          {showPrice && (
            <div>
              <label className="ui-form-label">
                Access tiers (optional)
              </label>
              <PriceOptionsField
                className="mt-1.5"
                value={values.priceOptions ?? []}
                onChange={(rows) => set("priceOptions", rows)}
                priceCurrency={values.priceCurrency}
                onCurrencyChange={(c) => set("priceCurrency", c)}
                showCurrency={false}
              />
            </div>
          )}
          {showPrice && hasAccessTiers ? (
            <div className="rounded-md border border-white/8 bg-zinc-900/30 px-2.5 py-2">
              <p className="ui-form-hint">
                <strong className="text-zinc-400">Per tier</strong>: set <em>Telegram (tier)</em> on each row (override
                for buyers of that tier). <strong className="text-zinc-400">Listing default</strong>{" "}
                {TELEGRAM_GROUP_BOT_UI
                  ? "is filled automatically after bot verification (below) when a tier has no own link."
                  : "is the “Telegram invite” field below when a tier has no per-tier link."}
              </p>
              {values.telegram ? (
                <p className="mt-1.5 break-all font-mono text-xs text-zinc-400">
                  Listing default (saved): {values.telegram}
                </p>
              ) : null}
            </div>
          ) : null}
          {showPrice && !hasAccessTiers ? (
            <div>
              <label className="ui-form-label">
                {TELEGRAM_GROUP_BOT_UI || TELEGRAM_GROUP_ID_FORM_UI ? "1 — " : ""}Telegram invite (optional)
              </label>
              <p className="mt-0.5 ui-form-hint">
                {TELEGRAM_GROUP_BOT_UI ? (
                  <>
                    t.me invite. After <strong>bot verification</strong> (bot is admin) this can fill in automatically;
                    you can still edit.
                  </>
                ) : (
                  "Public t.me invite link (e.g. t.me/+… for your group)."
                )}
              </p>
              <input
                className="mt-1.5 w-full max-w-md rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                value={values.telegram ?? ""}
                onChange={(e) => set("telegram", e.target.value)}
                placeholder={TELEGRAM_GROUP_BOT_UI ? "https://t.me/+... (can auto-fill after verify)" : "https://t.me/+..."}
              />
            </div>
          ) : null}
          {TELEGRAM_GROUP_BOT_UI && showPrice && mode === "edit" && project?.id ? (
            <div className="mt-0.5">
              <ProjectTelegramGroupSetup
                projectId={project.id}
                onSynced={(d: TelegramVipSyncPayload) => {
                  if (d.telegram) set("telegram", d.telegram);
                  if (d.telegramGroupChatId) set("telegramGroupChatId", d.telegramGroupChatId);
                  router.refresh();
                }}
              />
            </div>
          ) : null}
          {showPrice && !project?.id && (
            <p className="text-xs text-zinc-500">
              {TELEGRAM_GROUP_BOT_UI
                ? "Click Create listing — the edit page has bot verification when you’re ready."
                : "Click Create listing, then set Telegram links and group id on the next screen."}
            </p>
          )}
          {showPrice && TELEGRAM_GROUP_ID_FORM_UI ? (
            <div>
              <label className="ui-form-label">
                {TELEGRAM_GROUP_BOT_UI ? "3 —" : "2 —"} Telegram group id (optional)
              </label>
              <p className="mt-0.5 ui-form-hint">
                {TELEGRAM_GROUP_BOT_UI
                  ? "Filled from the bot after verification. You can also paste manually (e.g. RawData bot)."
                  : "Supergroup id (e.g. -100…). Use a bot like @userinfobot or your client’s group details. For future auto-kick, run the separate Telegram worker and enable the flags in .env."}
              </p>
              {mode === "edit" && project?.telegramGroupTitle ? (
                <p className="mt-1.5 text-xs text-zinc-400">
                  Group (from Telegram): <span className="text-zinc-200">{project.telegramGroupTitle}</span>
                </p>
              ) : null}
              <input
                className="mt-1.5 w-full max-w-md rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                value={values.telegramGroupChatId ?? ""}
                onChange={(e) => set("telegramGroupChatId", e.target.value)}
                placeholder="-1001234567890"
                inputMode="numeric"
              />
            </div>
          ) : null}
          <div>
            <label className="ui-form-label">Category</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-white/30 focus:outline-none"
              value={values.category ?? ""}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Airdrop / Calls / Education"
            />
          </div>
          <div>
            <label className="ui-form-label">Call rules</label>
            <textarea
              className="mt-1.5 min-h-[140px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.rules}
              onChange={(e) => set("rules", e.target.value)}
              placeholder="Member rules, banned actions, and expectations."
            />
          </div>

          <div>
            <label className="ui-form-label">Access delivery policy</label>
            <textarea
              className="mt-1.5 min-h-[100px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              value={values.deliveryPolicy}
              onChange={(e) => set("deliveryPolicy", e.target.value)}
              placeholder="How you provide invite access after payment."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
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
        <div className="rounded-lg border border-rose-400/20 bg-rose-950/30 px-2.5 py-1.5 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 pb-6">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {submitting ? "Saving..." : mode === "create" ? "Create listing" : "Update listing"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-white/15 px-2.5 py-1.5 text-sm text-zinc-300 transition hover:border-white/30"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
