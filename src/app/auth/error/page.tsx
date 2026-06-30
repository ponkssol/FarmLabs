import { resolveAuthErrorCopy } from "@/lib/auth-error-copy";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in error - FarmLabs",
};

type P = { searchParams: Promise<{ error?: string }> };

export default async function AuthErrorPage({ searchParams }: P) {
  const { error } = await searchParams;
  const block = resolveAuthErrorCopy(error);

  return (
    <div className="app-container py-16 sm:py-24">
      <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-zinc-950/60 p-6 sm:p-8">
        <h1 className="text-lg font-semibold tracking-tight text-white">{block.title}</h1>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-zinc-400 sm:text-sm">
          {block.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-zinc-500 sm:text-sm">
          <Link href="/login" className="text-sky-400 underline hover:text-sky-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
