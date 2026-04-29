import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Maps known failures (Vercel Blob, DB connectivity, Prisma) to a JSON error + status
 * so the client does not only see a generic 500 in the network tab.
 */
export function handleProjectApiError(e: unknown, logLabel: string): NextResponse {
  console.error(`[${logLabel}]`, e);

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "A listing with this value already exists. Try a different title." },
        { status: 409 },
      );
    }
    if (["P1001", "P1002", "P1003", "P1011", "P1017", "P2024"].includes(e.code)) {
      return NextResponse.json(
        {
          error:
            "Database is unreachable. In Vercel, set POSTGRES_PRISMA_URL or DATABASE_URL to a valid PostgreSQL URL (with sslmode if required) and run `npx prisma db push` against that database.",
        },
        { status: 503 },
      );
    }
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error:
          "Database connection failed. Check DATABASE_URL points to PostgreSQL and is reachable from Vercel (firewall, SSL, credentials).",
      },
      { status: 503 },
    );
  }

  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("BLOB_READ_WRITE_TOKEN") || msg.includes("Upload storage is not configured")) {
    return NextResponse.json(
      {
        error:
          "Image upload is not configured on the server. In Vercel, add a Blob store and set BLOB_READ_WRITE_TOKEN, or save the listing without choosing a new logo file.",
      },
      { status: 503 },
    );
  }

  if (e instanceof Prisma.PrismaClientUnknownRequestError || e instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: "Database error while saving. Check server logs.",
        ...(process.env.NODE_ENV === "development" ? { details: msg } : {}),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: "Could not save the listing. Check server logs (Vercel → Logs) and DATABASE_URL / BLOB_READ_WRITE_TOKEN if applicable.",
      ...(process.env.NODE_ENV === "development" && e instanceof Error ? { details: e.message } : {}),
    },
    { status: 500 },
  );
}
