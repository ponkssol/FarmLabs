import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignInX } from "./sign-in-x";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - FarmLabs",
};

type P = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function LoginPage({ searchParams }: P) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const { callbackUrl } = await searchParams;
  const safeCallback = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
  return (
    <div className="app-container py-16 sm:py-24">
      <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Use X (recommended for a public handle). Connect your Solana wallet on the dashboard after login.{" "}
        <span className="text-zinc-400">
          To set the VIP group for a listing, use &quot;Set on Telegram&quot; in the editor and run the bot command
          inside that group.
        </span>
      </p>
      <div className="mt-8">
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-6">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">X (Twitter)</p>
          <SignInX callbackUrl={safeCallback} />
        </div>
      </div>
      <p className="mt-6 text-xs text-zinc-600">
        X needs <code className="text-zinc-500">AUTH_TWITTER_ID</code> in <code className="text-zinc-500">.env</code>.
      </p>
      </div>
    </div>
  );
}
