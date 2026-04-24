import { z } from "zod";

export const groupTypeSchema = z.enum(["PUBLIC", "PRIVATE"]);
export const accessTypeSchema = z.enum(["FREE", "PAID"]);

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
  description: z.string().min(30).max(20_000),
  groupType: groupTypeSchema.default("PUBLIC"),
  accessType: accessTypeSchema.default("FREE"),
  priceUsd: z.coerce.number().min(1).max(100_000).optional(),
  category: z.string().max(80).optional().or(z.literal("")),
  memberCount: z.coerce.number().int().min(0).max(10_000_000).optional(),
  rules: z.string().min(10).max(20_000),
  deliveryPolicy: z.string().min(10).max(20_000),
  xCommunity: optUrl,
  telegram: optUrl,
  discord: optUrl,
  published: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.accessType === "PAID" && (value.priceUsd == null || Number.isNaN(value.priceUsd))) {
    ctx.addIssue({
      code: "custom",
      path: ["priceUsd"],
      message: "Price is required for paid groups",
    });
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
  return {
    ...input,
    priceUsd: input.accessType === "PAID" ? input.priceUsd : undefined,
    category: emptyToNull(input.category),
    xCommunity: emptyToNull(input.xCommunity),
    telegram: emptyToNull(input.telegram),
    discord: emptyToNull(input.discord),
    memberCount: input.memberCount ?? undefined,
  };
}

