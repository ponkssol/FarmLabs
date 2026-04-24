import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidSolanaAddress } from "@/lib/validate";
import { NextResponse } from "next/server";
import { z } from "zod";

const body = z.object({
  wallet: z.string().max(100).nullable(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { wallet } = parsed.data;
  if (wallet !== null && !isValidSolanaAddress(wallet)) {
    return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { wallet: wallet || null },
  });

  return NextResponse.json({ wallet: updated.wallet });
}

