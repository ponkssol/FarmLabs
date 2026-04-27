import { XUsername } from "@/components/x-username";
import type { Project, User } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type T = Project & {
  user: Pick<User, "name" | "image" | "wallet" | "xHandle"> & {
    accounts?: { providerAccountId: string }[];
  };
  priceOptions?: { priceAmount: number; telegramUrl?: string | null; discordUrl?: string | null }[];
};

export function ProjectCard({ project }: { project: T }) {
  return (
    <Link
      href={`/p/${project.slug}`}
      className="group block h-full rounded-xl border border-white/10 bg-gradient-to-b from-zinc-950 to-zinc-900 p-3 transition hover:-translate-y-0.5 hover:border-white/20 sm:p-3.5"
    >
      <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
        {project.communityImage ? (
          <div className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:h-10 sm:w-10">
            <Image
              src={project.communityImage}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <h3 className="min-w-0 flex-1 text-xs font-semibold leading-snug tracking-tight text-white sm:text-sm">
          {project.title}
        </h3>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[8px] leading-snug text-zinc-500/90 sm:text-[9px] sm:leading-relaxed">
        {project.shortPitch}
      </p>

      <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-1.5 text-xs text-zinc-500">
        {project.user.image ? (
          <Image
            src={project.user.image}
            width={16}
            height={16}
            className="h-4 w-4 rounded-full border border-white/10 object-cover"
            alt={project.user.name || "Creator"}
          />
        ) : (
          <div className="h-4 w-4 rounded-full border border-white/10 bg-zinc-800" />
        )}
        <span className="min-w-0">
          <span className="inline-flex min-w-0 items-center gap-1 leading-none">
            <span className="text-zinc-500">by</span>
            <XUsername
              name={project.user.name || "Anonymous creator"}
              xHandle={project.user.xHandle}
              xUserId={project.user.accounts?.[0]?.providerAccountId}
              className="truncate text-zinc-400"
              asNestedInLink
            />
            {project.user.wallet ? (
              <Image
                src="/verified-badge.png"
                alt="Verified"
                width={12}
                height={12}
                className="h-3 w-3 shrink-0"
              />
            ) : null}
          </span>
        </span>
      </div>
    </Link>
  );
}
