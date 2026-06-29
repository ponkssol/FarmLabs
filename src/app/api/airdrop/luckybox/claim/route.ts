import { NextResponse } from "next/server";

/** Legacy endpoint — lucky box claim now uses prepare + wallet sign + confirm. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Claim flow updated.",
      reason: "Connect your wallet and use the Claim button again so you can sign the transaction and pay the network fee.",
    },
    { status: 410 },
  );
}
