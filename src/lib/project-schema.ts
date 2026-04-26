import { z } from "zod";

export const groupTypeSchema = z.enum(["PUBLIC", "PRIVATE"]);
export const accessTypeSchema = z.enum(["FREE", "PAID"]);
export const priceCurrencySchema = z.enum(["USDC", "SOL"]);

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
  xCommunity: optUrl,
  telegram: optUrl,
  discord: optUrl,
  published: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.groupType === "PRIVATE" && value.accessType === "PAID") {
    if (value.priceAmount == null || Number.isNaN(value.priceAmount)) {
      ctx.addIssue({
        code: "custom",
        path: ["priceAmount"],
        message: "Price is required for paid private calls",
      });
    }
  }
  if (!value.telegram && !value.discord && !value.xCommunity) {
    ctx.addIssue({
      code: "custom",
      path: ["telegram"],
      message: "Add at least one link: Telegram, Discord, or X community",
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
  return {
    ...input,
    accessType: access,
    groupType: input.groupType,
    priceAmount: isPaid ? input.priceAmount : undefined,
    priceCurrency: isPaid ? currency : undefined,
    category: emptyToNull(input.category),
    xCommunity: emptyToNull(input.xCommunity),
    telegram: emptyToNull(input.telegram),
    discord: emptyToNull(input.discord),
    description: (input.description ?? "").trim(),
  };
}
