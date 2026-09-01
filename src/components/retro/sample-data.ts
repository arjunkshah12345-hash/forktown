import type { DistrictKind } from "@/lib/sim/types";

export interface SampleDistrict {
  id: string;
  name: string;
  kind: DistrictKind;
  gx: number;
  gy: number;
  health: number;
  load: number;
}

export interface SampleNpc {
  id: string;
  name: string;
  role: string;
  gx: number;
  gy: number;
  color: string;
  mood: "calm" | "angry" | "anxious";
}

export const SAMPLE_DISTRICTS: SampleDistrict[] = [
  { id: "d0", name: "Checkout Harbor", kind: "billing", gx: 4, gy: 10, health: 0.86, load: 0.55 },
  { id: "d1", name: "Invoice Barn", kind: "billing", gx: 8, gy: 12, health: 0.72, load: 0.68 },
  { id: "d2", name: "Identity Gate", kind: "auth", gx: 14, gy: 6, health: 0.91, load: 0.4 },
  { id: "d3", name: "Session Farm", kind: "auth", gx: 18, gy: 9, health: 0.84, load: 0.45 },
  { id: "d4", name: "API Pier", kind: "api", gx: 11, gy: 4, health: 0.78, load: 0.62 },
  { id: "d5", name: "Webhook Canal", kind: "api", gx: 22, gy: 11, health: 0.65, load: 0.7 },
  { id: "d6", name: "Ledger Silo", kind: "data", gx: 13, gy: 15, health: 0.88, load: 0.38 },
  { id: "d7", name: "Archive Cellar", kind: "data", gx: 6, gy: 16, health: 0.9, load: 0.28 },
  { id: "d8", name: "Ticket Cottage", kind: "support", gx: 3, gy: 6, health: 0.74, load: 0.52 },
  { id: "d9", name: "Close Bank", kind: "finance", gx: 19, gy: 15, health: 0.81, load: 0.48 },
  { id: "d10", name: "Red Team Tower", kind: "security", gx: 24, gy: 5, health: 0.76, load: 0.35 },
  { id: "d11", name: "Edge Windmill", kind: "edge", gx: 26, gy: 14, health: 0.89, load: 0.3 },
];

export const SAMPLE_NPCS: SampleNpc[] = [
  { id: "n0", name: "Forge", role: "Agent", gx: 10, gy: 8, color: "#5DADE2", mood: "calm" },
  { id: "n1", name: "Mara K.", role: "Legacy buyer", gx: 5, gy: 11, color: "#E74C3C", mood: "angry" },
  { id: "n2", name: "Devon SRE", role: "On-call", gx: 20, gy: 7, color: "#F4D03F", mood: "anxious" },
  { id: "n3", name: "Priya PM", role: "Scope keeper", gx: 16, gy: 12, color: "#AF7AC5", mood: "calm" },
];

export const SAMPLE_DIALOGUE = [
  {
    speaker: "Mara K.",
    portrait: "angry",
    text: "You moved checkout without telling finance. My coupon ghost still bills wrong — that's MY reference point.",
  },
  {
    speaker: "Forge",
    portrait: "agent",
    text: "Dual-write is live. Legacy coupon path stays flagged until cohort trust recovers above 62%.",
  },
  {
    speaker: "Devon SRE",
    portrait: "anxious",
    text: "Webhook retries spiked 3× in Invoice Barn. I'm not paging again unless we freeze the cutover.",
  },
  {
    speaker: "Priya PM",
    portrait: "calm",
    text: "Scope says v2 ships Friday. Town says Friday is a fiction unless survivability clears 70%.",
  },
  {
    speaker: "System",
    portrait: "system",
    text: "⚡ Rehearsal pulse · Invoice Barn load 68% · Trust −12% · Agent mitigations holding…",
  },
];

export const SAMPLE_STATS = {
  survivability: 71.7,
  trust: 58,
  anger: 34,
  churnReady: 3,
  negotiationTurns: 54,
  status: "survived" as const,
};

export const SAMPLE_TRUST_HISTORY = [72, 68, 65, 61, 58, 55, 52, 54, 56, 58, 57, 58];

export const SAMPLE_WAR_LOG = [
  "Mara K. chose ESCALATE — coupon path broken",
  "Forge offered dual-write mitigation (+trust)",
  "Devon SRE opened sev2 — webhook retries 3×",
  "Invoice Barn load → 68%",
  "Priya PM shifted deadline reference point",
  "Forge: legacy flag ON for cohort 7",
  "Traffic layer pressure +12%",
  "Mara trust −8% · anger +15%",
  "Negotiation round 54 — holding",
  "Survivability judge: 71.7% — survived",
];
