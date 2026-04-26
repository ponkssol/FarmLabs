import { formatListingPrice, shouldShowSolanaMonogram } from "@/lib/listing-price";
import { SolanaMark } from "@/components/solana/solana-mark";
import type { Project } from "@prisma/client";

type PriceOpts = { priceAmount: number }[] | null | undefined;

type P = Pick<Project, "id" | "groupType" | "accessType" | "priceAmount" | "priceCurrency">;

type Props = {
  project: P;
  priceOptions?: PriceOpts;
  className?: string;
  textClassName?: string;
  /** Smaller monogram (e.g. explore cards) */
  compact?: boolean;
  /** Larger monogram next to big product price (listing sidebar) */
  largeMark?: boolean;
};

/**
 * Renders `formatListingPrice` with a small Solana mark to the left when the price is in SOL.
 */
export function ListingPriceLabel({ project, priceOptions, className, textClassName, compact, largeMark }: Props) {
  const label = formatListingPrice(project, priceOptions);
  const show = shouldShowSolanaMonogram(project, label);
  const markClass = largeMark
    ? "h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
    : compact
      ? "h-1.5 w-1.5 shrink-0 sm:h-2 sm:w-2"
      : "h-2 w-2 shrink-0 sm:h-2.5 sm:w-2.5";
  if (!show) {
    return <span className={textClassName}>{label}</span>;
  }
  return (
    <span className={`inline-flex min-w-0 items-center gap-0.5 sm:gap-1 ${className ?? ""}`}>
      <SolanaMark className={markClass} gradientId={`sol-g-${project.id}`} />
      <span className={textClassName}>{label}</span>
    </span>
  );
}
