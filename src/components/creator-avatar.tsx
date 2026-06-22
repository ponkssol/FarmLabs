"use client";

import Image from "next/image";
import { useState } from "react";

const FARMLABS_AVATAR = "/favicon.png";

type Props = {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

export function CreatorAvatar({ src, alt, width, height, className }: Props) {
  const [imgSrc, setImgSrc] = useState(src?.trim() || FARMLABS_AVATAR);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      unoptimized={imgSrc === FARMLABS_AVATAR}
      className={className}
      onError={() => setImgSrc(FARMLABS_AVATAR)}
    />
  );
}
