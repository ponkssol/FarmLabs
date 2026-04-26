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
  return (
    <div className="app-container py-16 sm:py-24">
      <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Login with X</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Your X identity is used for listing and community trust on FarmLabs. Connect your Solana wallet
        on the dashboard after login.
      </p>
      <div className="mt-8 rounded-xl border border-white/10 bg-zinc-950/60 p-6">
        <SignInX callbackUrl={callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard"} />
      </div>
      <p className="mt-6 text-xs text-zinc-600">
        Requires <code className="text-zinc-500">AUTH_TWITTER_ID</code> and X OAuth credentials in {" "}
        <code className="text-zinc-500">.env</code>.
      </p>
      </div>
    </div>
  );
}
