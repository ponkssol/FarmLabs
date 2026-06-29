type Props = {
  message: string;
  reason?: string | null;
  variant?: "success" | "warning";
};

export function AirdropAlertBanner({ message, reason, variant = "warning" }: Props) {
  const isSuccess = variant === "success";

  return (
    <div
      className={`mt-4 w-full rounded-lg border px-3 py-2.5 text-center text-xs sm:text-sm ${
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/90"
          : "border-amber-500/20 bg-amber-500/5 text-amber-100/90"
      }`}
    >
      {!isSuccess ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400/90">Warning</p>
      ) : null}
      <p>{message}</p>
      {reason && !isSuccess ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-amber-200/65 sm:text-xs">{reason}</p>
      ) : null}
    </div>
  );
}
