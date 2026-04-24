import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeProjectForm, projectFormSchema } from "@/lib/project-schema";
import { uniqueProjectSlug } from "@/lib/slug";
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

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { user: { select: { name: true, image: true, wallet: true } } },
    }),
    prisma.project.count({ where }),
  ]);

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

  const project = await prisma.project.create({
    data: {
      title: data.title,
      shortPitch: data.shortPitch,
      description: data.description,
      groupType: data.groupType,
      accessType: data.accessType,
      priceUsd: data.accessType === "PAID" ? data.priceUsd ?? null : null,
      category: data.category ?? null,
      memberCount: data.memberCount ?? null,
      rules: data.rules,
      deliveryPolicy: data.deliveryPolicy,
      xCommunity: data.xCommunity,
      telegram: data.telegram ?? null,
      discord: data.discord,
      published: data.published ?? false,
      slug,
      userId: session.user.id,
    },
  });

  return NextResponse.json(project);
}

