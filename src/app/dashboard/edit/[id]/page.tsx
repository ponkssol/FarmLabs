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
    <div className="app-container py-4 sm:py-5">
      <div className="mb-3.5 sm:mb-4">
        <h1 className="text-xs font-semibold tracking-tight text-white sm:text-sm">Edit listing</h1>
        <p className="mt-0.5 text-[9px] leading-snug text-zinc-500 sm:text-[10px]">
          Keep your Telegram listing updated with fresh links, pricing, and access rules.
        </p>
      </div>
      <ProjectForm mode="edit" project={project} />
    </div>
  );
}



