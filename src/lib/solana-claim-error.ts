import { SendTransactionError } from "@solana/web3.js";

export const INSUFFICIENT_SOL_CLAIM_MESSAGE =
  "Your SOL wallet balance is insufficient. Please top up your wallet and try again." as const;

function collectErrorText(error: unknown): string {
  const parts: string[] = [];

  if (error instanceof SendTransactionError) {
    parts.push(error.message);
    parts.push(error.transactionError.message);
    const logs = error.transactionError.logs;
    if (logs?.length) {
      parts.push(logs.join("\n"));
    }
  } else if (error instanceof Error) {
    parts.push(error.message);
  } else if (error != null) {
    parts.push(String(error));
  }

  return parts.join("\n").toLowerCase();
}

function isInsufficientSolError(text: string): boolean {
  return (
    text.includes("insufficient funds for rent") ||
    text.includes("insufficient funds") ||
    text.includes("insufficient lamports") ||
    (text.includes("simulation failed") && text.includes("insufficient"))
  );
}

/** Maps Solana send/simulate failures to a short user-facing claim message. */
export function formatSolanaClaimError(error: unknown, fallback = "Claim failed. Please try again."): string {
  const text = collectErrorText(error);
  if (isInsufficientSolError(text)) {
    return INSUFFICIENT_SOL_CLAIM_MESSAGE;
  }
  return fallback;
}
