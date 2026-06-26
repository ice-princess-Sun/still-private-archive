"use client";

import { useEffect, useState } from "react";

type Ambience = "dawn" | "day" | "dusk" | "night";

const ambienceCopy: Record<
  Ambience,
  {
    label: string;
    note: string;
  }
> = {
  dawn: {
    label: "Morning archive",
    note: "The day opens quietly.",
  },
  day: {
    label: "Private archive",
    note: "Quiet things, held in clear light.",
  },
  dusk: {
    label: "Evening archive",
    note: "A softer hour for remembered things.",
  },
  night: {
    label: "Night archive",
    note: "Kept gently after dark.",
  },
};

function getAmbience(hour: number): Ambience {
  if (hour >= 5 && hour < 10) return "dawn";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

export function TimeAmbience() {
  useEffect(() => {
    function applyAmbience() {
      document.documentElement.dataset.ambience = getAmbience(new Date().getHours());
    }

    applyAmbience();
    const timer = window.setInterval(applyAmbience, 60_000);

    return () => {
      window.clearInterval(timer);
      delete document.documentElement.dataset.ambience;
    };
  }, []);

  return null;
}

export function TimeAmbienceKicker({ year }: { year: number }) {
  const [ambience, setAmbience] = useState<Ambience>("day");

  useEffect(() => {
    function updateAmbience() {
      setAmbience(getAmbience(new Date().getHours()));
    }

    updateAmbience();
    const timer = window.setInterval(updateAmbience, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const copy = ambienceCopy[ambience];

  return (
    <div className="mb-7 md:mb-9">
      <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted">
        {copy.label} · {year}
      </p>
      <p className="mt-3 max-w-xs text-[10px] uppercase tracking-[0.18em] text-muted/70">
        {copy.note}
      </p>
    </div>
  );
}
