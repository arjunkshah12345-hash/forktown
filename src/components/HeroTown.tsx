"use client";

import { useMemo } from "react";
import { TownMap } from "@/components/TownMap";
import type { District } from "@/lib/sim/types";

/** Client-only decorative hero map — same district layout language as live towns. */
const HERO_DISTRICTS: District[] = [
  { id: "h0", name: "Checkout Harbor", kind: "billing", x: 18, y: 42, health: 0.9, load: 0.4, dependencies: ["h6"] },
  { id: "h1", name: "Invoice District", kind: "billing", x: 32, y: 58, health: 0.85, load: 0.5, dependencies: ["h6", "h4"] },
  { id: "h2", name: "Identity Gate", kind: "auth", x: 55, y: 28, health: 0.92, load: 0.3, dependencies: [] },
  { id: "h3", name: "Session Yards", kind: "auth", x: 68, y: 40, health: 0.88, load: 0.35, dependencies: ["h2"] },
  { id: "h4", name: "Public Pier", kind: "api", x: 42, y: 22, health: 0.8, load: 0.55, dependencies: [] },
  { id: "h5", name: "Webhook Canal", kind: "api", x: 78, y: 55, health: 0.7, load: 0.6, dependencies: ["h4"] },
  { id: "h6", name: "Ledger Vault", kind: "data", x: 48, y: 72, health: 0.86, load: 0.45, dependencies: [] },
  { id: "h7", name: "Archive Quay", kind: "data", x: 22, y: 78, health: 0.9, load: 0.25, dependencies: ["h6"] },
  { id: "h8", name: "Ticket Row", kind: "support", x: 12, y: 28, health: 0.75, load: 0.5, dependencies: ["h0"] },
  { id: "h9", name: "Close Street", kind: "finance", x: 62, y: 78, health: 0.82, load: 0.4, dependencies: ["h0", "h1"] },
  { id: "h10", name: "Red Team Alley", kind: "security", x: 82, y: 22, health: 0.78, load: 0.35, dependencies: [] },
  { id: "h11", name: "Edge Spur", kind: "edge", x: 88, y: 70, health: 0.88, load: 0.3, dependencies: ["h4"] },
];

export function HeroTown() {
  const highlight = useMemo(() => ["h1", "h5", "h8"], []);
  return (
    <div className="h-full min-h-[100dvh] w-full p-3 pt-24 sm:p-6 sm:pt-28">
      <div className="shell h-[calc(100dvh-7.5rem)] min-h-[520px]">
        <TownMap
          districts={HERO_DISTRICTS}
          highlightIds={highlight}
          live
          className="h-full min-h-[500px] opacity-90"
        />
      </div>
    </div>
  );
}
