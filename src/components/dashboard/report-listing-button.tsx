"use client";

import Link from "next/link";
import { useState } from "react";

const reasons = [
  { value: "SPAM" as const, label: "Spam / off-topic promotion" },
  { value: "SCAM" as const, label: "Scam" },
  { value: "MISLEADING" as const, label: "Misleading information" },
  { value: "IP" as const, label: "Copyright or trademark" },
  { value: "OTHER" as const, label: "Other" },
];

type Props = {
  projectId: string;
  isOwner: boolean;
  isLoggedIn: boolean;
  callbackPath: string;
};

export function ReportListingButton({ projectId, isOwner, isLoggedIn, callbackPath }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]["value"]>("MISLEADING");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isOwner) {
    return null;
  }

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(callbackPath)}`}
        className="inline-flex w-full items-center justify-center rounded-lg border border-white/12 px-2.5 py-1.5 text-[10px] text-zinc-500 transition hover:border-rose-500/30 hover:text-rose-200/90"
      >
        Report listing (sign in)
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setErr(null);
          setOk(false);
        }}
        className="inline-flex w-full items-center justify-center rounded-lg border border-rose-500/20 bg-rose-950/20 px-2.5 py-1.5 text-[10px] text-rose-200/80 transition hover:border-rose-500/40"
      >
        Report listing
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {ok ? (
              <p className="text-sm text-zinc-300">Thanks — your report was received.</p>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-white">Report listing</h3>
                <p className="mt-1 text-[10px] text-zinc-500">We will review it against community policy.</p>
                <div className="mt-3 space-y-2">
                  <label className="block text-[9px] uppercase text-zinc-500">Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as (typeof reasons)[number]["value"])}
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
                  >
                    {reasons.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 min-h-[72px] w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
                  placeholder="Details (optional)"
                  maxLength={2000}
                />
                {err && <p className="mt-2 text-[10px] text-rose-300">{err}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-white/15 py-1.5 text-xs text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setErr(null);
                      setLoading(true);
                      try {
                        const res = await fetch(`/api/projects/${projectId}/report`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ reason, message: message.trim() || undefined }),
                        });
                        const data = (await res.json().catch(() => ({}))) as { error?: string };
                        if (!res.ok) {
                          setErr(data.error || "Failed to send");
                          return;
                        }
                        setOk(true);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex-1 rounded-lg bg-rose-600/80 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {loading ? "…" : "Send"}
                  </button>
                </div>
              </>
            )}
            {ok && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 w-full rounded-lg border border-white/15 py-1.5 text-xs text-zinc-400"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
