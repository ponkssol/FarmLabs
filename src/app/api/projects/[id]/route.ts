import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redactVipSocialLinks } from "@/lib/redact-vip-text";
import { normalizeProjectForm, projectFormSchema } from "@/lib/project-schema";
import { uniqueProjectSlug } from "@/lib/slug";
import { isPaidVipListing, shouldMaskVipLinks } from "@/lib/vip-link-access";
import { NextRequest, NextResponse } from "next/server";

type Params = { id: string };

export async function GET(
  _request: NextRequest,
  context: { params: Promise<Params> },
) {
  const { id } = await context.params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await auth();
  const viewerId = session?.user?.id;
  const hasEscrow = !!(
    viewerId &&
    (await prisma.escrowOrder.findFirst({
      where: { projectId: project.id, buyerId: viewerId },
    }))
  );
  const revealLinks = hasEscrow;
  if (revealLinks) return NextResponse.json(project);
  if (!isPaidVipListing(project)) return NextResponse.json(project);

  const masked: typeof project = {
    ...project,
    description: project.description
      ? redactVipSocialLinks(project.description)
      : project.description,
    rules: project.rules ? redactVipSocialLinks(project.rules) : project.rules,
    deliveryPolicy: project.deliveryPolicy
      ? redactVipSocialLinks(project.deliveryPolicy)
      : project.deliveryPolicy,
  };
  if (shouldMaskVipLinks(project)) {
    masked.telegram = null;
    masked.discord = null;
  }
  return NextResponse.json(masked);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const out = projectFormSchema.safeParse(json);
  if (!out.success) {
    return NextResponse.json({ error: out.error.flatten() }, { status: 400 });
  }
  const data = normalizeProjectForm(out.data);

  let slug = existing.slug;
  if (data.title !== existing.title) {
    slug = await uniqueProjectSlug(data.title);
  }

  const paid = data.groupType === "PRIVATE" && data.accessType === "PAID";
  const project = await prisma.project.update({
    where: { id },
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
      published: data.published ?? existing.published,
      slug,
    },
  });
  return NextResponse.json(project);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<Params> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.project.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

