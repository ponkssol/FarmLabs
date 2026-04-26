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
    <div className="app-container py-4 sm:py-5">
      <div className="mb-3 sm:mb-4">
        <h1 className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">New listing</h1>
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
          Form on the left, preview on the right. Same width and type scale as the rest of the app.
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



