import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Accent = "sky" | "amber" | "neutral";

const accentStyles: Record<
  Accent,
  { iconWrap: string; icon: string; eyebrow: string }
> = {
  sky: {
    iconWrap: "border-sky-500/25 bg-sky-500/10",
    icon: "text-sky-400",
    eyebrow: "text-sky-400/80",
  },
  amber: {
    iconWrap: "border-amber-500/25 bg-amber-500/10",
    icon: "text-amber-400",
    eyebrow: "text-amber-400/80",
  },
  neutral: {
    iconWrap: "border-white/10 bg-zinc-900/80",
    icon: "text-zinc-500",
    eyebrow: "text-zinc-500",
  },
};

type Props = {
  icon: LucideIcon;
  accent?: Accent;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  muted?: boolean;
};

export function AirdropPanelCard({
  icon: Icon,
  accent = "neutral",
  eyebrow,
  title,
  description,
  children,
  className = "",
  bodyClassName = "",
  muted = false,
}: Props) {
  const a = accentStyles[accent];

  return (
    <section
      className={`flex h-full min-h-[300px] flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 ${
        muted ? "opacity-90" : ""
      } ${className}`}
    >
      <div className="shrink-0 border-b border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-start gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${a.iconWrap}`}
          >
            <Icon className={`h-3.5 w-3.5 ${a.icon}`} strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${a.eyebrow}`}>
              {eyebrow}
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-white">{title}</h2>
            {description ? (
              <p className="mt-1 max-w-none text-[11px] leading-relaxed text-zinc-500 sm:text-xs">{description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`flex flex-1 flex-col px-3.5 py-3.5 sm:px-4 sm:py-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
