"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignInX({ callbackUrl }: { callbackUrl: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setErr(null);
          setLoading(true);
          try {
            await signIn("twitter", { callbackUrl });
          } catch {
            setErr("Could not start login.");
          } finally {
            setLoading(false);
          }
        }}
        className="w-full rounded-lg bg-white py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Continue with X"}
      </button>
      {err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
    </div>
  );
}
