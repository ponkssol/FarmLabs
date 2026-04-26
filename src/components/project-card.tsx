import { PlatformIcons } from "@/components/platform-icons";
import { XUsername } from "@/components/x-username";
import { formatListingPrice } from "@/lib/listing-price";
import type { Project, User } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type T = Project & {
  user: Pick<User, "name" | "image" | "wallet" | "xHandle"> & {
    accounts?: { providerAccountId: string }[];
  };
  priceOptions?: { priceAmount: number; telegramUrl?: string | null; discordUrl?: string | null }[];
};

export function ProjectCard({ project, compact = false }: { project: T; compact?: boolean }) {
  const priceLabel = formatListingPrice(project, project.priceOptions);
  const hasTierTg = project.priceOptions?.some((o) => o.telegramUrl?.trim());
  const hasTierDc = project.priceOptions?.some((o) => o.discordUrl?.trim());
  const showPlatforms =
    project.telegram?.trim() || project.discord?.trim() || hasTierTg || hasTierDc;
  const platformTelegram = project.telegram?.trim() || (hasTierTg ? "1" : "");
  const platformDiscord = project.discord?.trim() || (hasTierDc ? "1" : "");
  const typeLabel = project.groupType === "PUBLIC" ? "Public Call" : "Private Call";
  const accessLabel = project.accessType === "PAID" ? "VIP" : "Open";

  return (
    <Link
      href={`/p/${project.slug}`}
      className="group block h-full rounded-xl border border-white/10 bg-gradient-to-b from-zinc-950 to-zinc-900 p-4 transition hover:-translate-y-0.5 hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex flex-1 items-start gap-2.5 sm:gap-3">
          {project.communityImage ? (
            <div className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:h-12 sm:w-12">
              <Image
                src={project.communityImage}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <h3 className="min-w-0 text-sm font-semibold tracking-tight text-white sm:text-base">{project.title}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-500">
          {new Date(project.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <p className={`mt-2 text-xs leading-relaxed text-zinc-400 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>
        {project.shortPitch}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded-full border border-white/10 px-2 py-1 text-zinc-400">{typeLabel}</span>
        <span className="rounded-full border border-white/10 px-2 py-1 text-zinc-400">{accessLabel}</span>
        <span className="rounded-full border border-white/10 px-2 py-1 text-zinc-300">{priceLabel}</span>
        {showPlatforms && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1">
            <PlatformIcons telegram={platformTelegram} discord={platformDiscord} />
          </span>
        )}
        {project.category && <span className="rounded-full border border-white/10 px-2 py-1 text-zinc-400">{project.category}</span>}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2 text-[11px] text-zinc-500">
        {project.user.image ? (
          <Image
            src={project.user.image}
            width={20}
            height={20}
            className="h-5 w-5 rounded-full border border-white/10 object-cover"
            alt={project.user.name || "Creator"}
          />
        ) : (
          <div className="h-5 w-5 rounded-full border border-white/10 bg-zinc-800" />
        )}
        <span>
          by{" "}
          <XUsername
            name={project.user.name || "Anonymous creator"}
            xHandle={project.user.xHandle}
            xUserId={project.user.accounts?.[0]?.providerAccountId}
            className="text-zinc-300"
            asNestedInLink
          />
          {project.user.wallet && <span className="ml-2">- wallet verified</span>}
        </span>
      </div>
    </Link>
  );
}
