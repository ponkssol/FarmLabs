"use client";

import { DecimalPriceInput } from "@/components/decimal-price-input";
import type { ProjectForm } from "@/lib/project-schema";

const rowClass =
  "w-full rounded-md border border-white/10 bg-zinc-900 px-1.5 py-1 text-[10px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none sm:px-2 sm:py-1.5 sm:text-[11px]";

type Row = NonNullable<ProjectForm["priceOptions"]>[number];

function defaultRow(sortOrder: number): Row {
  return {
    label: "",
    priceAmount: 0.1,
    sortOrder,
    telegramUrl: undefined,
    discordUrl: undefined,
    accessDurationDays: undefined,
    discordRoleId: undefined,
  };
}

type Props = {
  value: Row[];
  onChange: (next: Row[]) => void;
  priceCurrency: ProjectForm["priceCurrency"];
  onCurrencyChange: (c: ProjectForm["priceCurrency"]) => void;
  showCurrency: boolean;
  /** e.g. sm:col-span-2 */
  className?: string;
};

export function PriceOptionsField({
  value,
  onChange,
  priceCurrency,
  onCurrencyChange,
  showCurrency,
  className = "",
}: Props) {
  function update(i: number, patch: Partial<Row>) {
    onChange(
      value.map((r, j) => (j === i ? { ...r, ...patch, priceAmount: patch.priceAmount ?? r.priceAmount } : r)),
    );
  }

  function addRow() {
    onChange([...value, defaultRow(value.length)]);
  }

  function removeRow(i: number) {
    onChange(value.filter((_, j) => j !== i));
  }

  return (
    <div className={className}>
      <p className="text-[9px] leading-relaxed text-zinc-500 sm:text-[10px]">
        Per tier: optional Telegram/Discord links (overrides the listing default for buyers who pick this tier).
        <span className="text-zinc-600"> Set access duration in days for expiry + future Telegram kick / Discord
        role automation via your own bots (Role ID = server role the buyer should get).</span>
      </p>
      {showCurrency && (
        <div className="mt-2 max-w-xs">
          <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">Currency (all tiers)</span>
          <select
            value={priceCurrency}
            onChange={(e) => onCurrencyChange(e.target.value as ProjectForm["priceCurrency"])}
            className={`${rowClass} mt-0.5`}
          >
            <option value="USDC">USDC</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
      )}
      <div className="mt-2 space-y-3">
        {value.length === 0 ? (
          <p className="text-[9px] text-zinc-600">No tiers yet — use the button below or fill the single price above.</p>
        ) : (
          value.map((row, i) => (
            <div
              key={row.id ?? `new-${i}`}
              className="space-y-2 rounded-md border border-white/8 bg-zinc-950/50 p-2.5"
            >
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2">
                <div className="min-w-0 flex-1">
                  <label className="text-[8px] font-medium uppercase text-zinc-500">Label</label>
                  <input
                    className={rowClass}
                    value={row.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    placeholder="e.g. 1 week, 1 month"
                  />
                </div>
                <div className="w-full sm:w-28">
                  <label className="text-[8px] font-medium uppercase text-zinc-500">Price</label>
                  <DecimalPriceInput
                    className={rowClass}
                    value={row.priceAmount}
                    onValueChange={(n) => update(i, { priceAmount: n ?? 0 })}
                    placeholder="0.002"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="shrink-0 self-end rounded border border-white/10 px-2 py-1 text-[9px] text-zinc-500 hover:text-zinc-300"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <div>
                  <label className="text-[8px] font-medium uppercase text-zinc-500">Telegram (tier, optional)</label>
                  <input
                    className={rowClass}
                    value={row.telegramUrl ?? ""}
                    onChange={(e) => update(i, { telegramUrl: e.target.value || undefined })}
                    placeholder="https://t.me/+…"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-medium uppercase text-zinc-500">Discord invite (optional)</label>
                  <input
                    className={rowClass}
                    value={row.discordUrl ?? ""}
                    onChange={(e) => update(i, { discordUrl: e.target.value || undefined })}
                    placeholder="https://discord.gg/…"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-medium uppercase text-zinc-500">Access days (optional)</label>
                  <input
                    type="number"
                    min={0}
                    max={3650}
                    className={rowClass}
                    value={row.accessDurationDays === undefined || row.accessDurationDays === 0 ? "" : row.accessDurationDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") return update(i, { accessDurationDays: undefined });
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n) && n >= 0) update(i, { accessDurationDays: n > 0 ? n : undefined });
                    }}
                    placeholder="e.g. 7, 30 — leave empty = no auto-expiry"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-medium uppercase text-zinc-500">Discord role ID (optional)</label>
                  <input
                    className={rowClass}
                    value={row.discordRoleId ?? ""}
                    onChange={(e) => update(i, { discordRoleId: e.target.value.trim() || undefined })}
                    placeholder="Server role for your bot to grant"
                  />
                </div>
              </div>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-dashed border-white/15 px-2 py-1 text-[9px] text-zinc-400 hover:border-white/25 hover:text-zinc-200"
        >
          + Add access tier
        </button>
      </div>
    </div>
  );
}
