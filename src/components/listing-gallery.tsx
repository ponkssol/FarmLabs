"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  images: string[];
  /** Tighter card / thumbnails (listing page) */
  compact?: boolean;
};

function gridClassName(count: number, compact: boolean) {
  const m = compact ? "mt-1.5" : "mt-3";
  if (count === 1) return compact ? `${m} max-w-lg w-full` : m;
  const g = compact ? "gap-2" : "gap-3";
  const cols = compact
    ? `grid ${m} grid-cols-1 ${g} sm:grid-cols-2 sm:max-w-2xl lg:max-w-3xl lg:grid-cols-3`
    : `grid ${m} grid-cols-1 ${g} sm:grid-cols-2 lg:grid-cols-3`;
  return cols;
}

export function ListingGallery({ images, compact = false }: Props) {
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
                  <span className="text-sm text-zinc-300">
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
                        className="rounded border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-sm text-zinc-200 transition enabled:hover:border-white/30 disabled:opacity-30"
                        aria-label="Previous image"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        disabled={openIndex >= images.length - 1}
                        className="rounded border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-sm text-zinc-200 transition enabled:hover:border-white/30 disabled:opacity-30"
                        aria-label="Next image"
                      >
                        →
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="rounded border border-white/20 bg-zinc-900/90 px-2 py-0.5 text-sm leading-none text-zinc-100 transition hover:border-white/40"
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

  const aspect = compact ? "aspect-[5/3] max-h-36 sm:max-h-40" : "aspect-[4/3]";
  const hintCls = compact
    ? "mt-1 text-[8px] leading-relaxed text-zinc-600 sm:text-[9px]"
    : "mt-1.5 text-[10px] leading-relaxed text-zinc-600 sm:text-[11px]";
  const btnRounded = compact ? "rounded-md" : "rounded-lg";
  const inset = compact ? "inset-1" : "inset-1.5 sm:inset-2";
  const viewLbl = compact ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-xs sm:text-xs";

  return (
    <>
      <p className={hintCls}>
        Tap to open full size · in lightbox{" "}
        <kbd className="rounded border border-white/10 px-0.5 font-sans">←</kbd>{" "}
        <kbd className="rounded border border-white/10 px-0.5 font-sans">→</kbd>{" "}
        <kbd className="rounded border border-white/10 px-0.5 font-sans">Esc</kbd>
      </p>
      <div className={gridClassName(images.length, compact)}>
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => open(i)}
            className={`group relative w-full overflow-hidden border border-white/8 bg-zinc-950/90 text-left transition hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 ${btnRounded} ${aspect}`}
            aria-label={`Open image ${i + 1} at full size`}
          >
            <div className={`absolute z-0 ${inset}`}>
              <Image
                src={src}
                alt=""
                fill
                unoptimized
                className="object-contain transition group-hover:opacity-95"
                sizes={compact ? "(min-width: 1024px) 22vw, 100vw" : "(min-width: 1024px) 30vw, 100vw"}
              />
            </div>
            <span
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex items-end justify-end bg-gradient-to-t from-black/45 via-black/5 to-transparent ${
                compact ? "p-1" : "p-1.5 sm:p-2"
              }`}
            >
              <span
                className={`rounded border border-white/20 bg-black/50 text-zinc-200 ${viewLbl}`}
              >
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
