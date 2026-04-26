"use client";

import { uploadCommunityLogoFile } from "@/lib/upload-community-client";
import Image from "next/image";
import { useState } from "react";

const MAX = 3;

type Props = {
  images: string[];
  onChange: (next: string[]) => void;
  helpText: string;
  labelClass: string;
  /** Smaller type + spacing (new-listing split form) */
  compact?: boolean;
};

export function ProjectDetailImagesField({ images, onChange, helpText, labelClass, compact }: Props) {
  const [uploading, setUploading] = useState(false);

  async function addFile(file: File) {
    if (images.length >= MAX) return;
    setUploading(true);
    try {
      const url = await uploadCommunityLogoFile(file);
      onChange([...images, url].slice(0, MAX));
    } finally {
      setUploading(false);
    }
  }

  const remove = (i: number) => {
    onChange(images.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <label className={`block ${labelClass}`}>Community &amp; product images (optional)</label>
      <p
        className={
          compact
            ? "mb-1 text-[9px] text-zinc-500 sm:text-[10px]"
            : "mt-0.5 text-[9px] leading-snug text-zinc-500 sm:text-[10px]"
        }
      >
        {helpText} Max {MAX} — same image rules as the logo (PNG, JPEG, WebP, GIF; 2MB).
      </p>
      <div className={compact ? "mt-1.5 space-y-2" : "mt-2 space-y-2.5"}>
        <div className="flex flex-wrap items-start gap-2">
          {images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className={
                compact
                  ? "relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900"
                  : "relative h-[72px] w-[90px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900"
              }
            >
              <Image
                src={url}
                alt=""
                width={90}
                height={72}
                unoptimized
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute end-0.5 top-0.5 rounded bg-black/60 px-1 text-[8px] text-zinc-200 transition hover:bg-black/80"
                aria-label={`Remove image ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {images.length < MAX && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              onChange={async (e) => {
                const f = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (f) await addFile(f);
              }}
              className={
                compact
                  ? "w-full min-w-0 text-[9px] text-zinc-500 file:me-1.5 file:rounded file:border-0 file:bg-zinc-800 file:px-1.5 file:py-1 file:text-zinc-200"
                  : "w-full max-w-xs text-[9px] text-zinc-400 file:me-1.5 file:rounded file:border-0 file:bg-zinc-800 file:px-1.5 file:py-1 file:text-[10px] file:text-zinc-200"
              }
            />
            {uploading ? (
              <span className={compact ? "text-[9px] text-zinc-500" : "text-[9px] text-zinc-500 sm:text-[10px]"}>
                Uploading…
              </span>
            ) : null}
          </div>
        )}
        {images.length > 0 && !compact ? (
          <p className="text-[8px] text-zinc-600 sm:text-[9px]">
            {images.length}/{MAX} image{images.length === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
