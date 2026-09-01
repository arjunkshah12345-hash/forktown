import type { MigrationKind, SurvivalReport } from "./types";

const REQUIRED: Record<MigrationKind, string[]> = {
  billing: ["dual-write", "idempotency", "kill-switch", "feature-flag"],
  auth: ["shadow", "kill-switch", "feature-flag", "session"],
  database: ["backfill", "expand", "read-repair", "kill-switch"],
  framework: ["feature-flag", "compat", "canary", "kill-switch"],
  api_version: ["shadow", "feature-flag", "idempotency", "deprec"],
};

export interface HypothesisVerdict {
  status: "supported" | "partial" | "falsified";
  summary: string;
  coverage: number;
  present: string[];
  missing: string[];
}

export function evaluateHypothesis(
  kind: MigrationKind,
  hypothesis: string,
  agentActions: string[],
  report: Pick<SurvivalReport, "survived" | "overall" | "cascadingFailures" | "subjective">,
): HypothesisVerdict {
  const required = REQUIRED[kind];
  const blob = agentActions.join(" ").toLowerCase();
  const present = required.filter((r) => blob.includes(r));
  const missing = required.filter((r) => !blob.includes(r));
  const coverage = present.length / required.length;

  const hyp = hypothesis.toLowerCase();
  const claimsDual = /dual-write|dual write/.test(hyp);
  const claimsFlags = /flag|cohort|canary/.test(hyp);
  const claimsKill = /kill-switch|rollback/.test(hyp);

  let status: HypothesisVerdict["status"] = "partial";
  if (report.survived && coverage >= 0.6 && (report.subjective?.meanTrust ?? 0) >= 0.4) {
    status = "supported";
  } else if (!report.survived || coverage < 0.35 || (report.subjective?.meanTrust ?? 1) < 0.28) {
    status = "falsified";
  }

  // Claim-check: if hypothesis promised dual-write but agent lacked it → lean falsified
  if (claimsDual && !blob.includes("dual-write") && !report.survived) status = "falsified";
  if (claimsFlags && !/flag|cohort/.test(blob) && report.overall < 0.55) status = "falsified";
  if (claimsKill && !/kill-switch|rollback/.test(blob) && report.cascadingFailures.some((f) => /outage/i.test(f))) {
    status = "falsified";
  }

  const summary =
    status === "supported"
      ? `Hypothesis held. Coverage ${(coverage * 100).toFixed(0)}% of core mitigations; town stayed shippable.`
      : status === "falsified"
        ? `Hypothesis falsified. Missing: ${missing.slice(0, 3).join(", ") || "recovery"}. Re-run colder with those moves.`
        : `Hypothesis partial. Mitigations ${(coverage * 100).toFixed(0)}% covered; trust still fragile — tighten canary.`;

  return { status, summary, coverage: +coverage.toFixed(3), present, missing };
}

export interface CastMind {
  id: string;
  name: string;
  role: string;
  segment?: string;
  decisions: number;
  avgUtility: number;
  finalTrust: number;
  finalAnger: number;
  topAction: string;
  memory?: string;
}

export function buildCast(
  events: Array<{
    decision?: {
      mindId: string;
      mindName: string;
      role: string;
      label: string;
      utility: number;
    };
  }>,
  minds: Array<{
    id: string;
    name: string;
    role: string;
    segment?: string;
    affect: { trust: number; anger: number };
    memories: Array<{ summary: string; salience: number }>;
  }>,
): CastMind[] {
  const byId = new Map<
    string,
    { name: string; role: string; utilities: number[]; labels: string[] }
  >();
  for (const e of events) {
    const d = e.decision;
    if (!d) continue;
    const cur = byId.get(d.mindId) ?? { name: d.mindName, role: d.role, utilities: [], labels: [] };
    cur.utilities.push(d.utility);
    cur.labels.push(d.label);
    byId.set(d.mindId, cur);
  }

  const cast: CastMind[] = [];
  for (const [id, agg] of byId) {
    const mind = minds.find((m) => m.id === id);
    const avg = agg.utilities.reduce((a, b) => a + b, 0) / agg.utilities.length;
    const topAction = agg.labels.sort(
      (a, b) => agg.labels.filter((x) => x === b).length - agg.labels.filter((x) => x === a).length,
    )[0]!;
    const mem = mind?.memories.slice().sort((a, b) => b.salience - a.salience)[0];
    cast.push({
      id,
      name: agg.name,
      role: agg.role,
      segment: mind?.segment,
      decisions: agg.utilities.length,
      avgUtility: +avg.toFixed(3),
      finalTrust: +(mind?.affect.trust ?? 0).toFixed(3),
      finalAnger: +(mind?.affect.anger ?? 0).toFixed(3),
      topAction,
      memory: mem?.summary,
    });
  }

  return cast
    .sort((a, b) => b.avgUtility * b.decisions - a.avgUtility * a.decisions)
    .slice(0, 6);
}
