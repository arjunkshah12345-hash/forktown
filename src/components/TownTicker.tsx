"use client";

import { useEffect, useState } from "react";

const AMBIENT = [
  "Legacy buyer recalls double-apply coupon — status-quo bias rising",
  "Finance mind: month-end reference point locked",
  "SRE arousal up — error budget anxiety",
  "Attacker probing webhook canal for missing idempotency",
  "Enterprise buyer loyalty holding; trust still fragile",
  "PM wants Friday ship; continuity valued lower than narrative",
  "Reviewer waiting on dual-write receipts before approving",
  "Past-due cohort: loss aversion λ elevated",
  "Ticket Row load climbing from fairness complaints",
  "Quiet district: patient buyers choosing wait-and-see",
];

export function TownTicker() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % AMBIENT.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pixel-ticker-bar">
      <span className="pixel-ticker-live">LIVE</span>
      <p key={i} className="pixel-ticker-line">
        {AMBIENT[i]}
      </p>
    </div>
  );
}
