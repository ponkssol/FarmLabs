import type { Prisma } from "@prisma/client";
import type { ProjectForm } from "@/lib/project-schema";

/** `normalizeProjectForm` uses `null` for empty tier URLs; DB stores null. */
type Row = Omit<NonNullable<ProjectForm["priceOptions"]>[number], "telegramUrl" | "discordUrl" | "accessDurationDays" | "discordRoleId"> & {
  telegramUrl?: string | null;
  discordUrl?: string | null;
  accessDurationDays?: number | null;
  discordRoleId?: string | null;
};

export async function replaceProjectPriceOptionsTx(
  tx: Prisma.TransactionClient,
  projectId: string,
  options: Row[],
) {
  await tx.projectPriceOption.deleteMany({ where: { projectId } });
  if (options.length === 0) return;
  await tx.projectPriceOption.createMany({
    data: options.map((o, i) => ({
      projectId,
      label: o.label,
      priceAmount: o.priceAmount,
      sortOrder: o.sortOrder ?? i,
      telegramUrl: o.telegramUrl ?? null,
      discordUrl: o.discordUrl ?? null,
      accessDurationDays: o.accessDurationDays ?? null,
      discordRoleId: o.discordRoleId ?? null,
    })),
  });
}
