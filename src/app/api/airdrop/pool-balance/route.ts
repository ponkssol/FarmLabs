import { getAirdropPoolTokenBalance } from "@/lib/airdrop-solana";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const balance = await getAirdropPoolTokenBalance();
    return NextResponse.json(balance);
  } catch (e) {
    console.error("[airdrop/pool-balance]", e);
    return NextResponse.json({ error: "Could not load pool balance." }, { status: 500 });
  }
}
