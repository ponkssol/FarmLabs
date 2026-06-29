import { SendTransactionError } from "@solana/web3.js";

export const INSUFFICIENT_SOL_CLAIM_MESSAGE =
  "Your SOL wallet balance is insufficient. Please top up your wallet and try again." as const;

export type FormattedClaimError = {
  message: string;
  reason: string;
};

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

  return parts.join("\n");
}

function isInsufficientSolError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("insufficient funds for rent") ||
    lower.includes("insufficient funds") ||
    lower.includes("insufficient lamports") ||
    (lower.includes("simulation failed") && lower.includes("insufficient"))
  );
}

function isPoolConfigError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("airdrop pool wallet is not configured") ||
    lower.includes("airdrop_dev_wallet_secret") ||
    lower.includes("airdrop_pool_wallet_secret")
  );
}

function isMintError(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("token mint not found") || lower.includes("unsupported token program");
}

function isAmountError(text: string): boolean {
  return text.toLowerCase().includes("airdrop amount must be greater than zero");
}

/** Maps Solana send/simulate failures to a short user-facing message plus a reason. */
export function formatSolanaClaimError(
  error: unknown,
  fallback = "Claim failed. Please try again.",
): FormattedClaimError {
  const text = collectErrorText(error);

  if (isInsufficientSolError(text)) {
    return {
      message: INSUFFICIENT_SOL_CLAIM_MESSAGE,
      reason:
        "Solana needs a small SOL balance in your wallet (about 0.003 SOL) to cover network fees and to create your token account before rewards can be sent.",
    };
  }

  if (isPoolConfigError(text)) {
    return {
      message: fallback,
      reason: "The reward service is temporarily unavailable. Please try again later.",
    };
  }

  if (isMintError(text)) {
    return {
      message: fallback,
      reason: "The reward token could not be found on the network. Please contact support if this keeps happening.",
    };
  }

  if (isAmountError(text)) {
    return {
      message: fallback,
      reason: "Your reward amount is invalid and could not be sent.",
    };
  }

  if (text.toLowerCase().includes("airdrop transfer failed")) {
    return {
      message: fallback,
      reason: "The transaction was submitted but did not confirm on Solana. Please wait a moment and try again.",
    };
  }

  if (error instanceof SendTransactionError) {
    return {
      message: fallback,
      reason: "The on-chain transaction could not be completed. Please try again in a few minutes.",
    };
  }

  return {
    message: fallback,
    reason: "Something went wrong while sending your tokens. Please try again.",
  };
}

export class AirdropClaimError extends Error {
  readonly reason: string;

  constructor(formatted: FormattedClaimError) {
    super(formatted.message);
    this.name = "AirdropClaimError";
    this.reason = formatted.reason;
  }
}
