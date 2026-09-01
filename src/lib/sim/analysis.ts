import type { Mind } from "./mind";
import type {
  PressureEvent,
  SimulationPhase,
  SurvivalReport,
  TrustCurvePoint,
} from "./types";

export interface TippingPoint {
  tick: number;
  phase: SimulationPhase;
  kind: "trust_crash" | "anger_spike" | "churn_cluster" | "outage_breach" | "recovery_turn";
  summary: string;
}

export interface SegmentPulse {
  segment: string;
  count: number;
  meanTrust: number;
  meanAnger: number;
  churnReady: number;
}

export function detectTippingPoints(curve: TrustCurvePoint[]): TippingPoint[] {
  const tips: TippingPoint[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1]!;
    const cur = curve[i]!;
    const trustDrop = prev.meanTrust - cur.meanTrust;
    const angerJump = cur.meanAnger - prev.meanAnger;
    const churnJump = cur.churnIntent - prev.churnIntent;
    const outageJump = cur.outagePercent - prev.outagePercent;

    if (trustDrop >= 0.06) {
      tips.push({
        tick: cur.tick,
        phase: cur.phase,
        kind: "trust_crash",
        summary: `Trust fell ${(trustDrop * 100).toFixed(0)}pts at t${cur.tick} (${cur.phase})`,
      });
    }
    if (angerJump >= 0.07) {
      tips.push({
        tick: cur.tick,
        phase: cur.phase,
        kind: "anger_spike",
        summary: `Anger spiked +${(angerJump * 100).toFixed(0)}pts at t${cur.tick} (${cur.phase})`,
      });
    }
    if (churnJump >= 3) {
      tips.push({
        tick: cur.tick,
        phase: cur.phase,
        kind: "churn_cluster",
        summary: `+${churnJump} churn-ready minds at t${cur.tick}`,
      });
    }
    if (outageJump >= 4) {
      tips.push({
        tick: cur.tick,
        phase: cur.phase,
        kind: "outage_breach",
        summary: `Outage +${outageJump.toFixed(1)}% at t${cur.tick}`,
      });
    }
    if (cur.phase === "recovery" && cur.meanTrust - prev.meanTrust >= 0.04) {
      tips.push({
        tick: cur.tick,
        phase: cur.phase,
        kind: "recovery_turn",
        summary: `Trust recovering +${((cur.meanTrust - prev.meanTrust) * 100).toFixed(0)}pts at t${cur.tick}`,
      });
    }
  }
  // Dedup similar kinds close together — keep strongest of each kind per phase
  const byKey = new Map<string, TippingPoint>();
  for (const t of tips) {
    const key = `${t.phase}:${t.kind}`;
    const prev = byKey.get(key);
    if (!prev || t.tick > prev.tick) byKey.set(key, t);
  }
  return [...byKey.values()].sort((a, b) => a.tick - b.tick).slice(0, 8);
}

export function segmentPulses(minds: Mind[]): SegmentPulse[] {
  const buyers = minds.filter((m) => m.role === "buyer");
  const segs = ["free", "pro", "enterprise", "legacy"] as const;
  return segs
    .map((segment) => {
      const cohort = buyers.filter((m) => m.segment === segment);
      if (!cohort.length) return null;
      return {
        segment,
        count: cohort.length,
        meanTrust: +(cohort.reduce((s, m) => s + m.affect.trust, 0) / cohort.length).toFixed(3),
        meanAnger: +(cohort.reduce((s, m) => s + m.affect.anger, 0) / cohort.length).toFixed(3),
        churnReady: cohort.filter((m) => m.affect.anger > 0.65 && m.affect.trust < 0.35).length,
      };
    })
    .filter(Boolean) as SegmentPulse[];
}

export function nearMissNote(report: Pick<SurvivalReport, "survived" | "overall" | "cascadingFailures">): string | null {
  if (report.survived && report.overall < 0.7) {
    return "Near miss — survived, but survivability is thin. One more hostile finance mind would flip the verdict.";
  }
  if (!report.survived && report.overall >= 0.55 && report.cascadingFailures.length <= 3) {
    return "Near miss collapse — one more mitigation (kill-switch or dual-write evidence) likely flips this to survive.";
  }
  return null;
}

export function hottestDistrict(
  events: PressureEvent[],
): { districtId: string; hits: number } | null {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e.districtId) continue;
    counts.set(e.districtId, (counts.get(e.districtId) ?? 0) + 1);
  }
  let best: { districtId: string; hits: number } | null = null;
  for (const [districtId, hits] of counts) {
    if (!best || hits > best.hits) best = { districtId, hits };
  }
  return best;
}
