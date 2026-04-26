import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeProjectForm, projectFormSchema } from "@/lib/project-schema";
import { replaceProjectPriceOptionsTx } from "@/lib/project-price-options-db";
import { uniqueProjectSlug } from "@/lib/slug";
import { redactVipSocialLinks } from "@/lib/redact-vip-text";
import { isPaidVipListing, shouldMaskVipLinks } from "@/lib/vip-link-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const listQuery = z.object({
  q: z.string().max(200).optional(),
  take: z.coerce.number().int().min(1).max(50).optional().default(20),
  skip: z.coerce.number().int().min(0).max(10_000).optional().default(0),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = listQuery.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { q, take, skip } = parsed.data;

  const where = {
    published: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { shortPitch: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {}),
  };

  const [rawItems, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        user: {
          select: {
            name: true,
            image: true,
            wallet: true,
            xHandle: true,
            accounts: {
              where: { provider: "twitter" },
              take: 1,
              select: { providerAccountId: true },
            },
          },
        },
        priceOptions: { select: { telegramUrl: true, discordUrl: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const session = await auth();
  const viewerId = session?.user?.id;
  const purchasedIds = viewerId
    ? new Set(
        (
          await prisma.escrowOrder.findMany({
            where: { buyerId: viewerId },
            select: { projectId: true },
          })
        ).map((o) => o.projectId),
      )
    : new Set<string>();

  const items = rawItems.map((p) => {
    const purchased = viewerId && purchasedIds.has(p.id);
    const reveal = purchased;
    if (reveal) return p;
    if (!isPaidVipListing(p)) return p;
    const textMasked = {
      description: p.description ? redactVipSocialLinks(p.description) : p.description,
      rules: p.rules ? redactVipSocialLinks(p.rules) : p.rules,
      deliveryPolicy: p.deliveryPolicy
        ? redactVipSocialLinks(p.deliveryPolicy)
        : p.deliveryPolicy,
    };
    if (!shouldMaskVipLinks(p, p.priceOptions)) {
      return { ...p, ...textMasked };
    }
    return {
      ...p,
      ...textMasked,
      telegram: null,
      discord: null,
      priceOptions: p.priceOptions?.map((o) => ({ ...o, telegramUrl: null, discordUrl: null })) ?? [],
    };
  });

  return NextResponse.json({ items, total });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.wallet) {
    return NextResponse.json(
      { error: "Connect your Solana wallet in the dashboard before publishing a listing." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const out = projectFormSchema.safeParse(json);
  if (!out.success) {
    return NextResponse.json({ error: out.error.flatten() }, { status: 400 });
  }
  const data = normalizeProjectForm(out.data);
  const slug = await uniqueProjectSlug(data.title);

  const paid = data.groupType === "PRIVATE" && data.accessType === "PAID";
  const priceOptsForTx = (data.priceOptions ?? []).map((o, i) => ({
    ...o,
    sortOrder: o.sortOrder ?? i,
  }));

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        title: data.title,
        shortPitch: data.shortPitch,
        description: data.description,
        groupType: data.groupType,
        accessType: data.accessType,
        priceAmount: paid ? data.priceAmount ?? null : null,
        priceCurrency: paid ? data.priceCurrency ?? null : null,
        category: data.category ?? null,
        rules: data.rules,
        deliveryPolicy: data.deliveryPolicy,
        communityImage: data.communityImage ?? null,
        detailImages: data.detailImages.length > 0 ? JSON.stringify(data.detailImages) : null,
        telegram: data.telegram ?? null,
        discord: data.discord,
        telegramGroupChatId: data.telegramGroupChatId ?? null,
        published: data.published ?? false,
        slug,
        userId: session.user.id,
      },
    });
    if (priceOptsForTx.length > 0) {
      await replaceProjectPriceOptionsTx(tx, p.id, priceOptsForTx);
    }
    return p;
  });

  return NextResponse.json(project);
}

