"use client";

import { useEffect, useState } from "react";

export function PixelLiveTicker({
  lines,
  badge = "LIVE",
  intervalMs = 3200,
}: {
  lines: string[];
  badge?: string;
  intervalMs?: number;
}) {
  const [i, setI] = useState(0);
  const safe = lines.length ? lines : ["Town square is quiet…"];

  useEffect(() => {
    setI(0);
    const id = setInterval(() => setI((v) => (v + 1) % safe.length), intervalMs);
    return () => clearInterval(id);
  }, [safe, intervalMs]);

  return (
    <div className="pixel-ticker pixel-live-ticker" aria-live="polite">
      <span className="pixel-ticker-badge">{badge}</span>
      <p className="pixel-ticker-text" key={`${i}-${safe[i]}`}>
        {safe[i]}
      </p>
    </div>
  );
}
