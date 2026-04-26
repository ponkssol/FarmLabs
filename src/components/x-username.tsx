"use client";

import { xProfileUrlFromUser } from "@/lib/x-profile";

type Props = {
  name: string;
  xHandle: string | null | undefined;
  /** From `Account.providerAccountId` when provider is `twitter` (works even if `xHandle` not yet saved). */
  xUserId?: string | null;
  className?: string;
  /**
   * When the label sits inside a parent `<Link>` (e.g. whole card is clickable),
   * we open X in a new tab without nesting <a> inside <a>.
   */
  asNestedInLink?: boolean;
};

/**
 * Show listing creator name; link to X using saved handle, or /i/user/{id} from OAuth account row.
 */
export function XUsername({
  name,
  xHandle,
  xUserId,
  className = "text-inherit",
  asNestedInLink = false,
}: Props) {
  const display = name || "Anonymous";
  const url = xProfileUrlFromUser(xHandle, xUserId);
  if (!url) {
    return <span className={className}>{display}</span>;
  }
  if (!asNestedInLink) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative z-10 inline underline-offset-2 hover:underline ${className}`}
      >
        {display}
      </a>
    );
  }
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }}
      className={`${className} cursor-pointer hover:underline`}
    >
      {display}
    </span>
  );
}
