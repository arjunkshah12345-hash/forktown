/**
 * Forktown Agent Policy Net (ft-agent-v1)
 *
 * Scores mitigation moves given world + fingerprint + migration kind.
 * Mid-run replan: when trust crashes or outage spikes, re-rank and inject
 * the highest-EV counterfactual move.
 */

import type { RepoFingerprint } from "../../github/fingerprint";
import type { MigrationKind, WorldSnapshot } from "../types";
import {
  attributeInput,
  buildMlp,
  forward,
  softmax,
  vec,
  type MlpWeights,
} from "./mlp";

export const AGENT_NET_VERSION = "ft-agent-v1";

const IN_DIM = 28;

const FEAT: string[] = [
  "outage",
  "tickets",
  "revenueRisk",
  "meanTrust",
  "meanAnger",
  "churn",
  "intensity",
  "legacyContracts",
  "kind_billing",
  "kind_auth",
  "kind_database",
  "kind_framework",
  "kind_api",
  "fp_stripe",
  "fp_webhooks",
  "fp_auth",
  "fp_migrations",
  "fp_prisma",
  "phase_stress",
  "phase_cutover",
  "phase_recovery",
  "move_dualwrite",
  "move_idempotency",
  "move_kill",
  "move_flags",
  "move_backfill",
  "move_shadow",
  "move_legacy",
];

export const AGENT_MOVE_BANK: Record<MigrationKind, string[]> = {
  billing: [
    "Dual-write old + new path with shadow compare",
    "Feature-flag cohort: 5% → 25% → 100%",
    "Backfill job with checkpoint + resume",
    "Idempotency keys on all money mutations",
    "Read-repair for mismatched ledger rows",
    "Kill-switch rollback to previous adapter",
    "Contract tests against synthetic finance close",
    "Preserve legacy bug behind explicit opt-in flag",
    "Shadow invoice compare for legacy cohort",
    "Finance close freeze window + orphan scrub",
  ],
  auth: [
    "Shadow-issue tokens beside sessions",
    "Feature-flag cohort: 5% → 25% → 100%",
    "Idempotency on session revoke",
    "Kill-switch rollback to previous adapter",
    "Preserve legacy cookie path behind flag",
    "Contract tests for MFA edge cases",
    "Read-repair for orphaned sessions",
    "Backfill job with checkpoint + resume",
    "Session repair cohort + forced reauth lane",
    "Attacker replay quarantine on auth webhooks",
  ],
  database: [
    "Dual-write old + new path with shadow compare",
    "Online backfill with checkpoint + resume",
    "Expand/contract schema steps",
    "Kill-switch rollback to previous adapter",
    "Read-repair for mismatched rows",
    "Lock-timeout budgets + retry",
    "Feature-flag cohort reads",
    "Contract tests against synthetic finance close",
    "Shadow read compare on hot paths",
    "Write throttle under lock contention",
  ],
  framework: [
    "Feature-flag cohort: 5% → 25% → 100%",
    "Kill-switch rollback to previous adapter",
    "Compat layer for deprecated APIs",
    "Contract tests for render paths",
    "Canary with error-budget brake",
    "Shadow traffic compare",
    "Preserve legacy bug behind explicit opt-in flag",
    "Idempotency keys on all money mutations",
    "Render path dual-stack for one release",
    "Error-budget auto-brake at 5% burn",
  ],
  api_version: [
    "Shadow traffic to v2",
    "Feature-flag cohort: 5% → 25% → 100%",
    "Idempotency keys on all money mutations",
    "Kill-switch rollback to previous adapter",
    "Contract tests for client SDKs",
    "Deprecation warnings before hard cut",
    "Read-repair for mismatched ledger rows",
    "Preserve legacy plan ID still accepted",
    "Client SDK canary with forced fallback",
    "Webhook signature dual-verify window",
  ],
};

let cached: MlpWeights | null = null;

function agentNet(): MlpWeights {
  if (cached) return cached;
  cached = buildMlp(
    { name: "agent-policy", version: AGENT_NET_VERSION, sizes: [IN_DIM, 48, 24, 1] },
    0x41474e54, // 'AGNT'
    0.5,
  );
  const L0 = cached.layers[0]!;
  const boost = (col: number, mag: number) => {
    for (let r = 0; r < L0.out; r++) L0.W[r * L0.in + col]! += mag * (1 - (r % 2) * 2);
  };
  // High outage → prefer kill-switch moves
  boost(0, 0.25);
  boost(23, 0.3);
  // Low trust → dual-write / flags
  boost(3, -0.2);
  boost(21, 0.28);
  boost(24, 0.22);
  // Stripe / webhooks → idempotency
  boost(13, 0.2);
  boost(14, 0.18);
  boost(22, 0.3);
  return cached;
}

function kindOneHot(kind: MigrationKind): number[] {
  return [
    kind === "billing" ? 1 : 0,
    kind === "auth" ? 1 : 0,
    kind === "database" ? 1 : 0,
    kind === "framework" ? 1 : 0,
    kind === "api_version" ? 1 : 0,
  ];
}

function moveFlags(move: string): number[] {
  const m = move.toLowerCase();
  return [
    /dual-write|dual write/.test(m) ? 1 : 0,
    /idempotency/.test(m) ? 1 : 0,
    /kill-switch|rollback/.test(m) ? 1 : 0,
    /feature-flag|cohort|canary/.test(m) ? 1 : 0,
    /backfill|checkpoint/.test(m) ? 1 : 0,
    /shadow/.test(m) ? 1 : 0,
    /legacy|preserve|cookie|compat/.test(m) ? 1 : 0,
  ];
}

export interface AgentPlanContext {
  kind: MigrationKind;
  intensity: number;
  world: WorldSnapshot;
  fp?: RepoFingerprint | null;
  phase?: string;
}

function encode(ctx: AgentPlanContext, move: string): Float64Array {
  const w = ctx.world;
  const fp = ctx.fp;
  const phase = ctx.phase ?? "prepare";
  const vals = [
    Math.min(1, w.outagePercent / 40),
    Math.min(1, w.activeTickets / 80),
    Math.min(1, w.revenueAtRisk / 250_000),
    w.meanTrust ?? 0.55,
    w.meanAnger ?? 0.25,
    Math.min(1, (w.churnIntent ?? 0) / 20),
    ctx.intensity / 5,
    Math.min(1, (w.legacyContracts ?? 0) / 80),
    ...kindOneHot(ctx.kind),
    fp?.hasStripe ? 1 : 0,
    fp?.hasWebhooks ? 1 : 0,
    fp?.hasAuth ? 1 : 0,
    fp?.hasMigrations ? 1 : 0,
    fp?.hasPrisma || fp?.hasDrizzle ? 1 : 0,
    phase === "stress" ? 1 : 0,
    phase === "cutover" ? 1 : 0,
    phase === "recovery" ? 1 : 0,
    ...moveFlags(move),
  ];
  const x = vec(IN_DIM);
  for (let i = 0; i < IN_DIM; i++) x[i] = vals[i] ?? 0;
  return x;
}

function heuristicBoost(move: string, ctx: AgentPlanContext): number {
  const m = move.toLowerCase();
  let s = 0;
  const w = ctx.world;
  if (w.outagePercent > 8 && /kill-switch|rollback|brake/.test(m)) s += 0.55;
  if ((w.meanTrust ?? 1) < 0.45 && /dual-write|shadow|legacy/.test(m)) s += 0.4;
  if ((w.churnIntent ?? 0) > 5 && /cohort|flag|holdout|scrub/.test(m)) s += 0.35;
  if (ctx.fp?.hasStripe && /idempotency|dual-write|finance/.test(m)) s += 0.45;
  if (ctx.fp?.hasWebhooks && /idempotency|shadow|quarantine/.test(m)) s += 0.4;
  if (ctx.kind === "auth" && /session|shadow|cookie|mfa/.test(m)) s += 0.35;
  if (ctx.kind === "database" && /backfill|expand|lock|read-repair/.test(m)) s += 0.4;
  if (ctx.intensity >= 4 && /kill-switch|error-budget|quarantine/.test(m)) s += 0.25;
  return s;
}

export interface AgentPlanResult {
  moves: string[];
  scores: Array<{ move: string; score: number }>;
  topFeatures: Array<{ feature: string; weight: number }>;
  planScore: number;
}

/** Rank and pick top-K mitigations for the opening plan */
export function planAgentMoves(
  ctx: AgentPlanContext,
  rng: () => number,
  count = 5,
): AgentPlanResult {
  const net = agentNet();
  const bank = AGENT_MOVE_BANK[ctx.kind];
  const scored = bank.map((move) => {
    const input = encode(ctx, move);
    const { out } = forward(net, input);
    const score = out[0]! + heuristicBoost(move, ctx) + rng() * 0.08;
    return { move, score, input };
  });
  scored.sort((a, b) => b.score - a.score);
  const picks = scored.slice(0, count);
  // Ensure critical coverage for intensity ≥ 3
  const ensure = (re: RegExp) => {
    if (picks.some((p) => re.test(p.move.toLowerCase()))) return;
    const cand = scored.find((s) => re.test(s.move.toLowerCase()));
    if (cand) picks[picks.length - 1] = cand;
  };
  if (ctx.intensity >= 3) {
    ensure(/kill-switch|rollback/);
    if (ctx.kind === "billing" || ctx.kind === "database") ensure(/dual-write/);
    if (ctx.fp?.hasStripe || ctx.fp?.hasWebhooks) ensure(/idempotency/);
    ensure(/feature-flag|cohort|canary/);
  }

  const probs = softmax(picks.map((p) => p.score));
  const planScore = probs.reduce((s, p, i) => s + p * picks[i]!.score, 0);
  const topFeatures = attributeInput(net, picks[0]!.input, FEAT, 6);

  return {
    moves: picks.map((p) => p.move),
    scores: picks.map((p) => ({ move: p.move, score: +p.score.toFixed(4) })),
    topFeatures,
    planScore: +planScore.toFixed(4),
  };
}

/** Mid-run replan: pick best unused counterfactual move for current crisis */
export function replanAgentMove(
  ctx: AgentPlanContext,
  already: string[],
): { move: string; score: number; reason: string } | null {
  const net = agentNet();
  const have = new Set(already.map((m) => m.toLowerCase()));
  const bank = AGENT_MOVE_BANK[ctx.kind];
  let best: { move: string; score: number } | null = null;
  for (const move of bank) {
    if ([...have].some((h) => h.includes(move.slice(0, 18).toLowerCase()) || move.toLowerCase().includes(h.slice(0, 18)))) {
      continue;
    }
    const input = encode(ctx, move);
    const { out } = forward(net, input);
    const score = out[0]! + heuristicBoost(move, ctx);
    if (!best || score > best.score) best = { move, score };
  }
  if (!best) return null;

  const w = ctx.world;
  let reason = "policy replan";
  if (w.outagePercent > 10) reason = "outage spike → agent net prefers recovery move";
  else if ((w.meanTrust ?? 1) < 0.4) reason = "trust crash → agent net injects continuity move";
  else if ((w.churnIntent ?? 0) > 6) reason = "churn cluster → agent net isolates cohort";

  return { move: best.move, score: +best.score.toFixed(4), reason };
}

/** One-step lookahead: estimate survivability delta if move were active */
export function lookaheadValue(move: string, ctx: AgentPlanContext): number {
  const m = move.toLowerCase();
  let v = 0.05;
  const w = ctx.world;
  if (/kill-switch|rollback/.test(m)) v += Math.min(0.25, w.outagePercent / 60);
  if (/dual-write|shadow/.test(m)) v += Math.min(0.2, 1 - (w.meanTrust ?? 0.5));
  if (/idempotency|quarantine/.test(m)) v += ctx.fp?.hasWebhooks || ctx.fp?.hasStripe ? 0.15 : 0.05;
  if (/feature-flag|cohort|canary/.test(m)) v += 0.08 + ctx.intensity * 0.01;
  if (/legacy|preserve/.test(m)) v += Math.min(0.12, (w.legacyContracts ?? 0) / 100);
  return v;
}
