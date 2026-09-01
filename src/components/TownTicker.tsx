"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
    const id = setInterval(() => setI((x) => (x + 1) % AMBIENT.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="beacon shrink-0" />
        <div className="relative h-5 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              className="font-display absolute inset-0 truncate text-sm text-ink"
            >
              {AMBIENT[i]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
