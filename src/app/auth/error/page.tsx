import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in error - FarmLabs",
};

type P = { searchParams: Promise<{ error?: string }> };

const COPY: Record<string, { title: string; lines: string[] }> = {
  AccessDenied: {
    title: "Access denied",
    lines: [
      "Most often: the X (Twitter) app is still in testing mode. Only test users (and the app owner) can use Sign in with X. Other X accounts are rejected until they are added as test users or the app is promoted to production.",
      "Add the @ handle that should be able to sign in: in developer.x.com open your app → User authentication → Test users (or promote the app per X’s rules).",
      "On the X authorization screen, do not choose Cancel. If the browser is logged into another X account, try a private/incognito window.",
      "If `AUTH_X_ALLOWLIST` is set in `.env`, only the listed @ handles (comma-separated) may sign in. Add your handle there, or clear it to allow all (after OAuth works).",
    ],
  },
  Configuration: {
    title: "Configuration error",
    lines: [
      "Check that `AUTH_TWITTER_ID` and `AUTH_TWITTER_SECRET` in `.env` match the app in X Developer, and that the Callback URL in X is exactly `https://…/api/auth/callback/twitter` (local: `http://localhost:3000/api/auth/callback/twitter`).",
    ],
  },
  Default: {
    title: "Sign in failed",
    lines: [
      "Try again from the login page. If it keeps failing, check your X Developer credentials and test-user limits.",
    ],
  },
};

export default async function AuthErrorPage({ searchParams }: P) {
  const { error } = await searchParams;
  const block = (error && COPY[error]) || COPY.Default;

  return (
    <div className="app-container py-16 sm:py-24">
      <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-zinc-950/60 p-6 sm:p-8">
        {error && error !== "Default" && (
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Error: {error}</p>
        )}
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-white">{block.title}</h1>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-zinc-400 sm:text-sm">
          {block.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-zinc-500 sm:text-sm">
          <Link href="/login" className="text-sky-400 underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
