"use client";

import { useEffect, useState } from "react";

const HEADLINES = [
  "BREAKING · Invoice Barn load 68% — Mara K. escalates coupon ghost",
  "Forge dual-writes legacy path · cohort trust +3%",
  "Webhook Canal retries 3× overnight · Devon SRE on-call",
  "Priya PM: Friday ship is fiction under 70% survivability",
  "Red Team Tower probes cutover window · no breach yet",
  "Ticket Cottage mail volume ↑ as trust dips below 60%",
];

export function PixelTicker() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % HEADLINES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pixel-ticker" aria-live="polite">
      <span className="pixel-ticker-badge">NEWS</span>
      <p className="pixel-ticker-text" key={i}>
        {HEADLINES[i]}
      </p>
    </div>
  );
}
