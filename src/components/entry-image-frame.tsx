"use client";

import Image from "next/image";
import { useState } from "react";

type Orientation = "landscape" | "portrait" | "square";

function getOrientation(width: number, height: number): Orientation {
  const ratio = width / height;

  if (ratio > 1.12) return "landscape";
  if (ratio < 0.88) return "portrait";
  return "square";
}

export function EntryImageFrame({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const [orientation, setOrientation] = useState<Orientation | null>(null);

  const frameClass =
    orientation === "portrait"
      ? "aspect-[4/5] max-h-[88svh] w-full md:mx-auto md:w-[min(70vw,44rem)]"
      : orientation === "square"
        ? "aspect-square max-h-[86svh] w-full md:mx-auto md:w-[min(78vw,54rem)]"
        : "aspect-[16/10] w-full";

  return (
    <div
      className={`relative overflow-hidden bg-[#d8d5ce]/70 shadow-[inset_0_0_0_1px_rgba(23,23,20,0.06)] ${frameClass}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        sizes={
          orientation === "portrait"
            ? "(min-width: 768px) 44rem, 100vw"
            : "(min-width: 1280px) 1152px, 100vw"
        }
        className={`image-drift object-cover transition-opacity duration-500 ${
          orientation ? "opacity-100" : "opacity-0"
        }`}
        onLoad={(event) => {
          const image = event.currentTarget;
          setOrientation(getOrientation(image.naturalWidth, image.naturalHeight));
        }}
      />
      <div className="absolute inset-0 bg-black/[0.015] transition duration-500 group-hover:bg-black/0" />
    </div>
  );
}
