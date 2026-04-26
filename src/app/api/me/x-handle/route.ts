import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Fetches X username via stored OAuth access_token and saves `User.xHandle`.
 * Call after deploy if links to x.com/{handle} are missing (no need to re-login if token is still valid).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "twitter" },
  });
  const token = account?.access_token;
  if (!token) {
    return NextResponse.json(
      { error: "No X connection token. Sign out and sign in with X again." },
      { status: 400 },
    );
  }

  const res = await fetch("https://api.x.com/2/users/me?user.fields=username", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "X API rejected the token. Sign out and sign in with X again.", needRelogin: true },
      { status: 400 },
    );
  }
  const j = (await res.json()) as { data?: { username?: string } };
  const handle = j.data?.username?.trim();
  if (!handle) {
    return NextResponse.json({ error: "No username in X response" }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { xHandle: handle },
  });

  return NextResponse.json({ xHandle: user.xHandle });
}
