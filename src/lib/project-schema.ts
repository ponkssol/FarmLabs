import { z } from "zod";

export const groupTypeSchema = z.enum(["PUBLIC", "PRIVATE"]);
export const accessTypeSchema = z.enum(["FREE", "PAID"]);
export const priceCurrencySchema = z.enum(["USDC", "SOL"]);

function isAllowedImageUrl(v: string) {
  if (v.includes("..") || v.includes("\0")) return false;
  if (v.startsWith("/uploads/communities/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const communityImageSchema = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z
    .string()
    .max(500)
    .optional()
    .refine(
      (v) => {
        if (v == null) return true;
        return isAllowedImageUrl(v);
      },
      { message: "Invalid community image" },
    ),
);

const detailImageItemSchema = z
  .string()
  .max(500)
  .refine((v) => isAllowedImageUrl(v), { message: "Invalid detail image" });

const detailImagesSchema = z
  .array(detailImageItemSchema)
  .max(3)
  .default([]);

const optUrl = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z
    .string()
    .max(2000)
    .optional()
    .refine(
      (v) => {
        if (v == null) return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid URL" },
    ),
);

const priceOptionRowSchema = z.object({
  id: z.string().max(40).optional(),
  label: z.string().min(1).max(100).trim(),
  priceAmount: z.coerce.number().min(0.000_001).max(1_000_000_000),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional().default(0),
  telegramUrl: optUrl,
  discordUrl: optUrl,
  accessDurationDays: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(0).max(3650).optional(),
  ),
  discordRoleId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().max(32).optional(),
  ),
});

const priceOptionsSchema = z
  .array(priceOptionRowSchema)
  .max(20)
  .default([]);

export const projectFormSchema = z.object({
  title: z.string().min(2).max(120),
  shortPitch: z.string().min(10).max(280),
  description: z.string().max(20_000).default(""),
  groupType: groupTypeSchema.default("PUBLIC"),
  accessType: accessTypeSchema.default("FREE"),
  priceAmount: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(0.000_001).max(1_000_000_000).optional(),
  ),
  priceCurrency: priceCurrencySchema.default("USDC"),
  category: z.string().max(80).optional().or(z.literal("")),
  rules: z.string().min(10).max(20_000),
  deliveryPolicy: z.string().min(10).max(20_000),
  communityImage: communityImageSchema,
  /** Community / product detail images (max 3), same path rules as communityImage */
  detailImages: z.preprocess(
    (v) => (v === undefined || v === null || !Array.isArray(v) ? [] : v),
    detailImagesSchema,
  ),
  telegram: optUrl,
  discord: optUrl,
  /// Supergroup id for the FarmLabs Telegram kick bot (e.g. -1001234567890)
  telegramGroupChatId: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z
      .string()
      .max(20)
      .regex(/^-?\d{5,20}$/, "Invalid Telegram group id (e.g. -1001234567890 from your group info)")
      .optional(),
  ),
  published: z.boolean().optional(),
  /** Access tiers (optional). If empty, use single `priceAmount` on the project. */
  priceOptions: z.preprocess(
    (v) => (v === undefined || v === null || !Array.isArray(v) ? [] : v),
    priceOptionsSchema,
  ),
}).superRefine((value, ctx) => {
  if (value.groupType === "PRIVATE" && value.accessType === "PAID") {
    const opts = (value.priceOptions ?? []).filter((o) => o.label.trim().length > 0);
    if (opts.length === 0) {
      if (value.priceAmount == null || Number.isNaN(value.priceAmount)) {
        ctx.addIssue({
          code: "custom",
          path: ["priceAmount"],
          message: "Set a price, or add at least one access tier (label + amount).",
        });
      }
    } else {
      for (let i = 0; i < opts.length; i++) {
        if (!Number.isFinite(opts[i].priceAmount) || opts[i].priceAmount <= 0) {
          ctx.addIssue({
            code: "custom",
            path: ["priceOptions", i, "priceAmount"],
            message: "Each tier needs a price greater than 0",
          });
        }
      }
    }
  }
  const hasProjectLink = Boolean((value.telegram && String(value.telegram).trim()) || (value.discord && String(value.discord).trim()));
  const hasTierLink = (value.priceOptions ?? []).some(
    (o) => (o.telegramUrl && o.telegramUrl.trim()) || (o.discordUrl && o.discordUrl.trim()),
  );
  if (!hasProjectLink && !hasTierLink) {
    ctx.addIssue({
      code: "custom",
      path: ["telegram"],
      message: "Add at least one link: set Telegram/Discord on the listing, or add tier-specific links on each access tier.",
    });
  }
});

export type ProjectForm = z.infer<typeof projectFormSchema>;

function emptyToNull(s: string | undefined) {
  const t = s?.trim();
  return t ? t : undefined;
}

export function normalizeProjectForm(input: ProjectForm) {
  const isPublic = input.groupType === "PUBLIC";
  const access = isPublic ? "FREE" : input.accessType;
  const isPaid = access === "PAID" && !isPublic;
  const currency: "USDC" | "SOL" = input.priceCurrency === "SOL" ? "SOL" : "USDC";
  const detailImages = (input.detailImages ?? []).filter(Boolean).slice(0, 3);
  const rawOpts = (input.priceOptions ?? []).filter((o) => o.label?.trim().length > 0);
  const priceOptions = rawOpts.map((o, i) => ({
    label: o.label.trim(),
    priceAmount: o.priceAmount,
    sortOrder: o.sortOrder ?? i,
    telegramUrl: emptyToNull(o.telegramUrl) ?? null,
    discordUrl: emptyToNull(o.discordUrl) ?? null,
    accessDurationDays:
      o.accessDurationDays != null && o.accessDurationDays > 0 ? o.accessDurationDays : null,
    discordRoleId: o.discordRoleId?.trim() || null,
  }));
  let priceAmount: number | undefined;
  if (isPaid) {
    if (priceOptions.length > 0) {
      priceAmount = Math.min(...priceOptions.map((o) => o.priceAmount));
    } else {
      priceAmount = input.priceAmount;
    }
  } else {
    priceAmount = undefined;
  }
  return {
    ...input,
    accessType: access,
    groupType: input.groupType,
    priceAmount,
    priceCurrency: isPaid ? currency : undefined,
    priceOptions,
    category: emptyToNull(input.category),
    communityImage: emptyToNull(input.communityImage),
    detailImages,
    telegram: emptyToNull(input.telegram),
    discord: emptyToNull(input.discord),
    description: (input.description ?? "").trim(),
    telegramGroupChatId: isPaid
      ? (() => {
          const t = input.telegramGroupChatId?.trim();
          return t && /^-?\d{5,20}$/.test(t) ? t : null;
        })()
      : null,
  };
}
