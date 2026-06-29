import { auth } from "@/auth";
import { requireWaitlistEntry } from "@/lib/airdrop-luckybox";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

export type ClaimContext =
  | { ok: true; userId: string; wallet: string; rewardAmount: number; entryId: string }
  | { ok: false; response: NextResponse };

export async function resolveLuckyBoxClaimContext(): Promise<ClaimContext> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Sign in first to claim.",
          reason: "You must be signed in with your X account before claiming rewards.",
        },
        { status: 401 },
      ),
    };
  }

  const wallet = session.user.wallet?.trim();
  if (!wallet) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Connect and save your Solana wallet before claiming.",
          reason: "We need your wallet address on file to send your token reward.",
        },
        { status: 400 },
      ),
    };
  }

  try {
    new PublicKey(wallet);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Invalid wallet address on your profile.",
          reason: "Reconnect your Solana wallet from the header and try again.",
        },
        { status: 400 },
      ),
    };
  }

  const entry = await requireWaitlistEntry(session.user.id);
  if (!entry) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Join the waitlist first.",
          reason: "Only waitlist members can claim a lucky box reward.",
        },
        { status: 403 },
      ),
    };
  }

  if (entry.rewardStatus === "CLAIMED" && entry.txSignature) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "You already claimed this reward.",
          reason: "Each waitlist lucky box can only be claimed once.",
        },
        { status: 409 },
      ),
    };
  }

  if (entry.rewardStatus !== "OPENED" || entry.rewardAmount == null) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Open your lucky box first to reveal your reward.",
          reason: "Your reward amount is only assigned after you open the lucky box.",
        },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    wallet,
    rewardAmount: entry.rewardAmount,
    entryId: entry.id,
  };
}
