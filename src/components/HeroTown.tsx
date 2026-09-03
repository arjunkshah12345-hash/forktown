"use client";

import { PixelTitleCanvas } from "@/components/retro/PixelTitleCanvas";

/** Full-bleed living voxel town for the marketing hero. */
export function HeroTown() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#7ec8f7]">
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-[110%] w-[130%] max-w-none sm:h-full sm:w-full">
          <PixelTitleCanvas />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,15,10,0.15) 0%, transparent 25%, transparent 45%, rgba(26,15,10,0.55) 72%, rgba(26,15,10,0.92) 100%)",
        }}
      />
    </div>
  );
}
