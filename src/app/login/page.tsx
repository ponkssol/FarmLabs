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
          Sign in with your account to continue to FarmLabs.
        </p>
        <div className="mt-8">
          <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">X (Twitter)</p>
            <SignInX callbackUrl={safeCallback} />
          </div>
        </div>
      </div>
    </div>
  );
}
