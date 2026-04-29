import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/** Shown in API JSON `error` — no ops details for end users. */
const SAVE_FAILED = "Failed to save. Please try again." as const;

/**
 * Maps server failures to a short client-safe message. Full errors stay in logs only.
 */
export function handleProjectApiError(e: unknown, logLabel: string): NextResponse {
  console.error(`[${logLabel}]`, e);

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: SAVE_FAILED }, { status: 409 });
    }
    if (["P1001", "P1002", "P1003", "P1011", "P1017", "P2024"].includes(e.code)) {
      return NextResponse.json({ error: SAVE_FAILED }, { status: 503 });
    }
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json({ error: SAVE_FAILED }, { status: 503 });
  }

  const msg = e instanceof Error ? e.message : String(e);
  if (
    msg.includes("BLOB_READ_WRITE_TOKEN") ||
    msg.includes("Upload storage is not configured") ||
    msg.includes("Vercel Blob") ||
    msg.toLowerCase().includes("access denied")
  ) {
    return NextResponse.json({ error: SAVE_FAILED }, { status: 503 });
  }

  if (e instanceof Prisma.PrismaClientUnknownRequestError || e instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({ error: SAVE_FAILED }, { status: 500 });
  }

  return NextResponse.json({ error: SAVE_FAILED }, { status: 500 });
}
