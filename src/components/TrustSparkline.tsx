"use client";

import { useMemo } from "react";
import type { WorldSnapshot } from "@/lib/sim/types";

export function TrustSparkline({
  snapshots,
  height = 56,
}: {
  snapshots: WorldSnapshot[];
  height?: number;
}) {
  const { trustPath, angerPath, w } = useMemo(() => {
    const pts = snapshots.filter((s) => s.meanTrust != null);
    const w = Math.max(120, pts.length * 14);
    if (pts.length < 2) {
      return { trustPath: "", angerPath: "", w };
    }
    const toPath = (key: "meanTrust" | "meanAnger") =>
      pts
        .map((s, i) => {
          const x = (i / (pts.length - 1)) * (w - 4) + 2;
          const v = (s[key] ?? 0) as number;
          const y = height - 4 - v * (height - 8);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    return { trustPath: toPath("meanTrust"), angerPath: toPath("meanAnger"), w };
  }, [snapshots, height]);

  if (!trustPath) {
    return (
      <div className="font-display text-xs text-ink-soft" style={{ height }}>
        Trust pulse warming up…
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-14 w-full" preserveAspectRatio="none" aria-label="Trust and anger over ticks">
      <path d={angerPath} fill="none" stroke="var(--danger)" strokeWidth="2" strokeOpacity="0.55" />
      <path d={trustPath} fill="none" stroke="var(--alive)" strokeWidth="2.5" />
    </svg>
  );
}
