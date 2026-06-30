export type AuthErrorCopy = {
  title: string;
  lines: string[];
};

export const AUTH_ERROR_COPY = {
  XBanned: {
    title: "X account unavailable",
    lines: [
      "This X (Twitter) account cannot be used to sign in. It may be suspended, restricted, or banned by X.",
      "Try a different X account, or contact X support if you think this is a mistake.",
    ],
  },
  AccessDenied: {
    title: "Sign in not allowed",
    lines: [
      "Your X account is not permitted to sign in to FarmLabs right now.",
      "If you cancelled on the X screen, try again and approve access. Otherwise, try another X account.",
    ],
  },
  Unavailable: {
    title: "Sign in temporarily unavailable",
    lines: [
      "We could not complete sign in with X. Please try again in a few minutes.",
      "If it keeps failing, open a private window or try a different X account.",
    ],
  },
  Default: {
    title: "Sign in failed",
    lines: ["Something went wrong while signing in with X. Please try again."],
  },
} as const satisfies Record<string, AuthErrorCopy>;

/** Maps Auth.js error codes to short, user-facing copy (no env or dev details). */
export function resolveAuthErrorCopy(error?: string | null): AuthErrorCopy {
  if (error === "XBanned") {
    return AUTH_ERROR_COPY.XBanned;
  }
  if (error === "AccessDenied") {
    return AUTH_ERROR_COPY.AccessDenied;
  }
  if (
    error === "Configuration" ||
    error === "OAuthCallback" ||
    error === "OAuthSignin" ||
    error === "Callback" ||
    error === "Verification"
  ) {
    return AUTH_ERROR_COPY.Unavailable;
  }
  return AUTH_ERROR_COPY.Default;
}

export function isXBannedOrSuspendedResponse(status: number, body: string): boolean {
  if (status !== 403 && status !== 401) {
    return false;
  }
  const lower = body.toLowerCase();
  return (
    lower.includes("suspend") ||
    lower.includes("banned") ||
    lower.includes("locked") ||
    lower.includes("restricted") ||
    lower.includes("not active") ||
    lower.includes("user is not authorized")
  );
}
