"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  images: string[];
};

function gridClassName(count: number) {
  if (count === 1) return "mt-3";
  return "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
}

export function ListingGallery({ images }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpenIndex(null), []);
  const open = (i: number) => setOpenIndex(i);
  const go = useCallback((d: -1 | 1) => {
    setOpenIndex((i) => {
      if (i === null) return i;
      const n = i + d;
      if (n < 0 || n >= images.length) return i;
      return n;
    });
  }, [images.length]);

  useEffect(() => {
    if (openIndex === null) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, go]);

  if (images.length === 0) return null;

  const modal =
    openIndex !== null && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Full image preview"
          >
            <button
              type="button"
              className="absolute inset-0 border-0 bg-black/80 backdrop-blur-sm"
              onClick={close}
              aria-label="Close"
            />
            <div
              className="relative z-[201] flex max-h-[100vh] w-full max-w-5xl flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex w-full items-center justify-between gap-2 px-0.5 sm:px-0">
                {images.length > 1 ? (
                  <span className="text-[10px] text-zinc-300">
                    {openIndex + 1} / {images.length}
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1.5">
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        disabled={openIndex <= 0}
                        className="rounded border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-200 transition enabled:hover:border-white/30 disabled:opacity-30"
                        aria-label="Previous image"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        disabled={openIndex >= images.length - 1}
                        className="rounded border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-200 transition enabled:hover:border-white/30 disabled:opacity-30"
                        aria-label="Next image"
                      >
                        →
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="rounded border border-white/20 bg-zinc-900/90 px-2 py-0.5 text-[12px] leading-none text-zinc-100 transition hover:border-white/40"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950/50 p-2 sm:p-4">
                <Image
                  src={images[openIndex]!}
                  alt=""
                  width={2000}
                  height={2000}
                  unoptimized
                  className="h-auto max-h-[min(90vh,920px)] w-auto max-w-full object-contain"
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <p className="mt-1.5 text-[8px] text-zinc-600 sm:text-[9px]">
        Thumbnails are uncropped. Click to open full size. In the lightbox use{" "}
        <kbd className="rounded border border-white/10 px-0.5 text-[7px]">←</kbd> /{" "}
        <kbd className="rounded border border-white/10 px-0.5 text-[7px]">→</kbd> /{" "}
        <kbd className="rounded border border-white/10 px-0.5 text-[7px]">Esc</kbd>.
      </p>
      <div className={gridClassName(images.length)}>
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => open(i)}
            className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/8 bg-zinc-950/90 text-left transition hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            aria-label={`Open image ${i + 1} at full size`}
          >
            <div className="absolute inset-1.5 z-0 sm:inset-2">
              <Image
                src={src}
                alt=""
                fill
                unoptimized
                className="object-contain transition group-hover:opacity-95"
                sizes="(min-width: 1024px) 30vw, 100vw"
              />
            </div>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex items-end justify-end bg-gradient-to-t from-black/45 via-black/5 to-transparent p-1.5 sm:p-2">
              <span className="rounded border border-white/20 bg-black/50 px-1.5 py-0.5 text-[8px] text-zinc-200 sm:text-[9px]">
                View
              </span>
            </span>
          </button>
        ))}
      </div>
      {modal}
    </>
  );
}
