import { NewProjectSplit } from "@/components/dashboard/new-project-split";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New call listing - FarmLabs",
};

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/new");
  if (!session.user.wallet) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-base font-semibold tracking-tight">Create call listing</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-500">
          Left side for form input, right side for live preview before you publish.
        </p>
      </div>
      <NewProjectSplit
        creatorName={session.user.name ?? null}
        creatorImage={session.user.image ?? null}
        wallet={session.user.wallet ?? null}
      />
    </div>
  );
}



