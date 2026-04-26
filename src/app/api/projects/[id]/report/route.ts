import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reportSchema = z.object({
  reason: z.enum(["SPAM", "SCAM", "MISLEADING", "IP", "OTHER"]),
  message: z.string().max(2000).optional(),
});

type Params = { id: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !project.published) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (project.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot report your own listing" }, { status: 400 });
  }

  try {
    const report = await prisma.projectReport.create({
      data: {
        projectId,
        reporterId: session.user.id,
        reason: parsed.data.reason,
        message: parsed.data.message?.trim() || null,
        status: "OPEN",
      },
    });
    return NextResponse.json({ ok: true, id: report.id });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json(
        { error: "You have already reported this listing." },
        { status: 409 },
      );
    }
    throw e;
  }
}
