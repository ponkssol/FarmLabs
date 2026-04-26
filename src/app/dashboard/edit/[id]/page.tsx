import { ProjectForm } from "@/components/project-form";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id } });
  return { title: p ? `Edit ${p.title} - FarmLabs` : "Edit listing - FarmLabs" };
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) notFound();

  return (
    <div className="app-container py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-base font-semibold tracking-tight">Edit listing</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-500">Keep your Telegram listing updated with fresh links, pricing, and access rules.</p>
      </div>
      <ProjectForm mode="edit" project={project} />
    </div>
  );
}



