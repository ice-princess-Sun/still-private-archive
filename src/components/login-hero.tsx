"use client";

import { useState } from "react";

type HeroImage = {
  url: string;
  position: string;
};

export function LoginHero({
  images,
  initialIndex,
}: {
  images: HeroImage[];
  initialIndex: number;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeImage = images[activeIndex] ?? images[0];

  function showNextImage() {
    setActiveIndex((current) => (current + 1) % images.length);
  }

  return (
    <section className="relative min-h-[42svh] overflow-hidden bg-[#262923] sm:min-h-[48svh] lg:min-h-screen">
      <button
        type="button"
        aria-label="切换登录页图片"
        className="group absolute inset-0 cursor-pointer text-left active:scale-[0.998]"
        onClick={showNextImage}
      >
        <span
          className="absolute inset-0 bg-cover opacity-80 transition duration-700 ease-out group-hover:scale-[1.015]"
          style={{
            backgroundImage: `url("${activeImage.url}")`,
            backgroundPosition: activeImage.position,
          }}
        />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.08)_38%,rgba(0,0,0,0.55))] lg:bg-black/20" />
        <span className="absolute bottom-7 right-6 hidden text-[10px] font-medium uppercase tracking-[0.24em] text-white/55 transition group-hover:text-white/80 sm:block lg:bottom-10 lg:right-10">
          Change image
        </span>
      </button>

      <p className="pointer-events-none absolute left-6 top-6 font-serif text-2xl font-semibold tracking-[-0.04em] text-white sm:left-10 sm:top-9">
        STILL
      </p>
      <blockquote className="pointer-events-none absolute bottom-7 left-6 max-w-[18rem] font-serif text-3xl leading-tight text-white sm:left-10 sm:max-w-md sm:text-4xl lg:bottom-10">
        “We keep what time would otherwise take away.”
      </blockquote>
    </section>
  );
}
