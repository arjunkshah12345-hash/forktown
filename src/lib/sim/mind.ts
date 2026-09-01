/**
 * Forktown Subjective Mind Model
 *
 * Decisions are not coin flips. Each synthetic person has:
 * - personality (prospect-theory λ, status-quo bias, loyalty, …)
 * - affect (trust, anger, anxiety, arousal)
 * - episodic memory (salient billing moments)
 * - a reference point (what “normal” feels like)
 *
 * Options are scored with Kahneman–Tversky value + probability weighting,
 * then chosen via softmax whose temperature rises with arousal/impulsivity.
 * The log explains *why* that mind picked that act.
 */

import { createPrng, int, pick } from "./prng";
import { clamp01 } from "./mind-utils";
import type { Actor, ActorKind, MigrationKind, PressureLayer, SyntheticUser } from "./types";

export interface Personality {
  /** Prospect-theory loss aversion λ — typically 1.8–3.2 */
  lossAversion: number;
  riskTolerance: number;
  statusQuoBias: number;
  priceSensitivity: number;
  fairnessSensitivity: number;
  patience: number;
  loyalty: number;
  trustBaseline: number;
  impulsivity: number;
  conscientiousness: number;
}

export interface Affect {
  trust: number;
  anger: number;
  anxiety: number;
  satisfaction: number;
  /** 0 calm → 1 flooded; raises decision temperature */
  arousal: number;
}

export interface MemoryTrace {
  id: string;
  kind: string;
  valence: number;
  salience: number;
  summary: string;
}

export type MindRole = "buyer" | ActorKind;

export interface Mind {
  id: string;
  role: MindRole;
  name: string;
  userId?: string;
  actorId?: string;
  segment?: SyntheticUser["segment"];
  personality: Personality;
  affect: Affect;
  memories: MemoryTrace[];
  /** Subjective expected utility of “things working as they used to” */
  referencePoint: number;
  /** What this mind optimizes for */
  values: Record<string, number>;
}

export interface OutcomeDelta {
  /** e.g. money, fairness, continuity, safety, reputation, control */
  dimension: string;
  /** signed change vs reference; negative = loss */
  delta: number;
  probability: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  layer: PressureLayer;
  outcomes: OutcomeDelta[];
  /** narrative fragment for rationale */
  motive: string;
}

export interface SubjectiveDecision {
  mindId: string;
  mindName: string;
  role: MindRole;
  optionId: string;
  label: string;
  layer: PressureLayer;
  utility: number;
  /** runner-up for transparency */
  runnerUp?: { label: string; utility: number };
  rationale: string;
  affectAfter: Pick<Affect, "trust" | "anger" | "anxiety">;
  magnitude: number;
}

export interface WorldStimulus {
  tick: number;
  intensity: number;
  migrationKind: MigrationKind;
  outagePercent: number;
  activeTickets: number;
  revenueAtRisk: number;
  agentMitigations: string[];
  /** how much the change threatens continuity / money / fairness */
  disruption: {
    continuity: number;
    money: number;
    fairness: number;
    safety: number;
    control: number;
  };
}

/** Prospect theory value function v(x) */
export function prospectValue(x: number, lossAversion: number, alpha = 0.88): number {
  if (x >= 0) return Math.pow(x, alpha);
  return -lossAversion * Math.pow(Math.abs(x), alpha);
}

/** Prelec-ish probability weighting — overweight small probs */
export function weightProb(p: number, gamma = 0.65): number {
  const clamped = Math.min(0.999, Math.max(0.001, p));
  return Math.exp(-Math.pow(-Math.log(clamped), gamma));
}

function memoryBias(mind: Mind): number {
  if (!mind.memories.length) return 0;
  let w = 0;
  let s = 0;
  for (const m of mind.memories) {
    w += m.valence * m.salience;
    s += m.salience;
  }
  return s ? w / s : 0;
}

function scoreOption(mind: Mind, option: DecisionOption, stim: WorldStimulus): number {
  const p = mind.personality;
  const a = mind.affect;
  let eu = 0;

  for (const o of option.outcomes) {
    const valueWeight =
      (mind.values[o.dimension] ?? 0.5) *
      (o.dimension === "money" ? 0.7 + p.priceSensitivity * 0.6 : 1) *
      (o.dimension === "fairness" ? 0.6 + p.fairnessSensitivity * 0.8 : 1) *
      (o.dimension === "continuity" ? 0.5 + p.statusQuoBias * 0.9 : 1) *
      (o.dimension === "safety" ? 0.5 + p.conscientiousness * 0.7 : 1);

    // Losses relative to reference feel worse; anger amplifies losses
    const angerAmp = 1 + a.anger * 0.55;
    const trustDamp = 1 - a.trust * 0.25;
    const signed = o.delta * angerAmp * trustDamp;
    eu += weightProb(o.probability) * prospectValue(signed, p.lossAversion) * valueWeight;
  }

  // Status-quo bonus for passive options
  if (option.id === "ignore" || option.id === "wait_and_see" || option.id === "approve") {
    eu += p.statusQuoBias * 0.35 * (1 - stim.disruption.continuity);
    eu += p.loyalty * 0.25 * a.trust;
    eu += p.patience * 0.2;
  }

  // Escalatory options feel better when angry / anxious / low trust
  if (["open_ticket", "escalate", "threaten_churn", "churn", "page", "block_pr", "exploit_bug"].includes(option.id)) {
    eu += a.anger * 0.45 + a.anxiety * 0.3 + (1 - a.trust) * 0.4;
    eu -= p.patience * 0.35;
    eu -= p.loyalty * 0.2;
  }

  // Attackers invert fairness — they hunt weakness
  if (mind.role === "attacker") {
    eu += stim.disruption.safety * 0.6 + (1 - a.trust) * 0.2;
  }

  // Memory tint
  eu += memoryBias(mind) * 0.35;

  // Intensity / outage raises salience of lossy options
  eu += (option.outcomes.some((o) => o.delta < 0) ? -1 : 1) * stim.outagePercent * 0.008;

  return eu;
}

function softmaxPick(
  scored: Array<{ option: DecisionOption; utility: number }>,
  temperature: number,
  rng: () => number,
): { option: DecisionOption; utility: number } {
  const t = Math.max(0.05, temperature);
  const maxU = Math.max(...scored.map((s) => s.utility));
  const exps = scored.map((s) => Math.exp((s.utility - maxU) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < scored.length; i++) {
    r -= exps[i]!;
    if (r <= 0) return scored[i]!;
  }
  return scored[scored.length - 1]!;
}

function buildRationale(
  mind: Mind,
  chosen: DecisionOption,
  utility: number,
  runnerUp: { label: string; utility: number } | undefined,
  stim: WorldStimulus,
): string {
  const traits: string[] = [];
  if (mind.personality.lossAversion >= 2.4) traits.push("loss-averse");
  if (mind.personality.statusQuoBias >= 0.65) traits.push("status-quo biased");
  if (mind.personality.priceSensitivity >= 0.65) traits.push("price-sensitive");
  if (mind.personality.loyalty >= 0.65) traits.push("loyal");
  if (mind.affect.anger >= 0.55) traits.push("angry");
  if (mind.affect.trust < 0.4) traits.push("low-trust");
  if (mind.affect.anxiety >= 0.55) traits.push("anxious");

  const traitStr = traits.length ? traits.join(", ") : "balanced";
  const mem = mind.memories.slice().sort((a, b) => b.salience - a.salience)[0];
  const memBit = mem ? ` Memory: “${mem.summary}”.` : "";
  const vs = runnerUp
    ? utility >= runnerUp.utility
      ? ` Preferred over “${runnerUp.label}” (${utility.toFixed(2)} vs ${runnerUp.utility.toFixed(2)}).`
      : ` Softmax under arousal picked this over higher-EU “${runnerUp.label}” (${runnerUp.utility.toFixed(2)} > ${utility.toFixed(2)}).`
    : "";

  return `${mind.name} [${traitStr}] chose “${chosen.label}” — ${chosen.motive} Reference continuity felt ${(mind.referencePoint * 100).toFixed(0)}%; disruption ${(stim.disruption.continuity * 100).toFixed(0)}%.${vs}${memBit}`;
}

function applyAffectFromChoice(mind: Mind, option: DecisionOption): Affect {
  const next = { ...mind.affect };
  const lossy = option.outcomes.reduce((s, o) => s + Math.min(0, o.delta), 0);
  const gainy = option.outcomes.reduce((s, o) => s + Math.max(0, o.delta), 0);

  if (["open_ticket", "escalate", "threaten_churn", "churn", "page", "block_pr"].includes(option.id)) {
    next.anger = clamp01(next.anger + 0.08 - lossy * 0.05);
    next.anxiety = clamp01(next.anxiety + 0.06);
    next.trust = clamp01(next.trust - 0.05);
    next.arousal = clamp01(next.arousal + 0.1);
  } else if (option.id === "ignore" || option.id === "wait_and_see" || option.id === "approve") {
    next.arousal = clamp01(next.arousal - 0.04);
    next.satisfaction = clamp01(next.satisfaction + 0.02);
  } else if (option.id === "exploit_bug") {
    next.satisfaction = clamp01(next.satisfaction + 0.05);
    next.trust = clamp01(next.trust - 0.03);
  }

  next.satisfaction = clamp01(next.satisfaction + gainy * 0.04 + lossy * 0.06);
  return next;
}

export function decide(
  mind: Mind,
  options: DecisionOption[],
  stim: WorldStimulus,
  rng: () => number,
): SubjectiveDecision {
  const scored = options.map((option) => ({
    option,
    utility: scoreOption(mind, option, stim),
  }));
  scored.sort((a, b) => b.utility - a.utility);

  const temperature =
    0.15 +
    mind.personality.impulsivity * 0.55 +
    mind.affect.arousal * 0.5 +
    (1 - mind.personality.conscientiousness) * 0.2;

  const picked = softmaxPick(scored, temperature, rng);
  const runner =
    scored.find((s) => s.option.id !== picked.option.id) ??
    scored[1];

  const affectAfter = applyAffectFromChoice(mind, picked.option);
  mind.affect = affectAfter;

  // magnitude from |utility| gap and intensity
  const gap = runner ? Math.abs(picked.utility - runner.utility) : Math.abs(picked.utility);
  const magnitude = clamp01(0.2 + gap * 0.35 + stim.intensity * 0.06 + mind.affect.arousal * 0.2);

  return {
    mindId: mind.id,
    mindName: mind.name,
    role: mind.role,
    optionId: picked.option.id,
    label: picked.option.label,
    layer: picked.option.layer,
    utility: +picked.utility.toFixed(3),
    runnerUp: runner
      ? { label: runner.option.label, utility: +runner.utility.toFixed(3) }
      : undefined,
    rationale: buildRationale(
      mind,
      picked.option,
      picked.utility,
      runner ? { label: runner.option.label, utility: runner.utility } : undefined,
      stim,
    ),
    affectAfter: {
      trust: +affectAfter.trust.toFixed(3),
      anger: +affectAfter.anger.toFixed(3),
      anxiety: +affectAfter.anxiety.toFixed(3),
    },
    magnitude,
  };
}

function trait(rng: () => number, skew = 0.5, spread = 0.28) {
  return clamp01(skew + (rng() - 0.5) * spread * 2);
}

const BUYER_MEMORIES = [
  { kind: "billing", valence: -0.7, summary: "Charged twice last year; took three tickets to fix" },
  { kind: "coupon", valence: 0.4, summary: "Double-apply coupon saved the renewal" },
  { kind: "outage", valence: -0.5, summary: "Invoice PDF failed during board meeting" },
  { kind: "support", valence: 0.3, summary: "CS agent waived a fee — felt respected" },
  { kind: "legacy", valence: 0.55, summary: "Legacy plan still works; afraid of ‘upgrades’" },
  { kind: "tax", valence: -0.4, summary: "VAT miscalc caused finance scramble" },
  { kind: "refund", valence: -0.6, summary: "Refund posted but access died for a day" },
];

export function inventBuyerMind(user: SyntheticUser, rng: () => number): Mind {
  const legacy = user.segment === "legacy";
  const ent = user.segment === "enterprise";
  const pastDue = user.billingState === "past_due" || user.billingState === "refunded";

  const personality: Personality = {
    lossAversion: 1.7 + rng() * 1.5 + (legacy ? 0.35 : 0),
    riskTolerance: trait(rng, ent ? 0.35 : 0.5),
    statusQuoBias: trait(rng, legacy ? 0.78 : 0.45),
    priceSensitivity: trait(rng, user.segment === "free" ? 0.75 : 0.45),
    fairnessSensitivity: trait(rng, 0.55),
    patience: trait(rng, pastDue ? 0.25 : 0.55),
    loyalty: trait(rng, ent ? 0.65 : legacy ? 0.4 : 0.5),
    trustBaseline: trait(rng, pastDue ? 0.3 : 0.6),
    impulsivity: trait(rng, user.anger > 0.5 ? 0.65 : 0.4),
    conscientiousness: trait(rng, ent ? 0.6 : 0.45),
  };

  const memCount = int(rng, 1, 3);
  const memories: MemoryTrace[] = [];
  for (let i = 0; i < memCount; i++) {
    const m = pick(rng, BUYER_MEMORIES);
    memories.push({
      id: `mem_${user.id}_${i}`,
      kind: m.kind,
      valence: m.valence,
      salience: 0.4 + rng() * 0.55,
      summary: m.summary,
    });
  }
  if (user.dependsOnBug) {
    memories.push({
      id: `mem_${user.id}_bug`,
      kind: "legacy",
      valence: 0.7,
      salience: 0.85,
      summary: `Depends on bug: ${user.dependsOnBug}`,
    });
  }

  const trust = clamp01(personality.trustBaseline - user.anger * 0.35 + memoryBias({ memories } as Mind) * 0.1);

  return {
    id: `mind_${user.id}`,
    role: "buyer",
    name: user.name,
    userId: user.id,
    segment: user.segment,
    personality,
    affect: {
      trust,
      anger: user.anger,
      anxiety: clamp01(pastDue ? 0.55 + rng() * 0.25 : 0.15 + rng() * 0.35),
      satisfaction: clamp01(0.4 + trust * 0.3 - user.anger * 0.2),
      arousal: clamp01(user.anger * 0.5 + (pastDue ? 0.3 : 0.1)),
    },
    memories,
    referencePoint: clamp01(0.55 + personality.statusQuoBias * 0.25 + (legacy ? 0.1 : 0)),
    values: {
      money: 0.4 + personality.priceSensitivity * 0.5,
      fairness: 0.35 + personality.fairnessSensitivity * 0.5,
      continuity: 0.4 + personality.statusQuoBias * 0.55,
      safety: 0.25 + personality.conscientiousness * 0.3,
      control: ent ? 0.7 : 0.35,
      reputation: ent ? 0.65 : 0.25,
    },
  };
}

const ACTOR_VALUES: Record<string, Record<string, number>> = {
  pm: { control: 0.85, reputation: 0.7, continuity: 0.3, safety: 0.25, money: 0.4, fairness: 0.35 },
  sre: { safety: 0.9, continuity: 0.7, control: 0.55, reputation: 0.5, money: 0.2, fairness: 0.3 },
  attacker: { control: 0.8, safety: -0.5, money: 0.4, fairness: -0.3, continuity: 0.1, reputation: 0.2 },
  reviewer: { safety: 0.75, fairness: 0.6, continuity: 0.55, control: 0.4, money: 0.2, reputation: 0.5 },
  finance: { money: 0.95, fairness: 0.55, continuity: 0.7, safety: 0.4, control: 0.5, reputation: 0.65 },
  support_agent: { fairness: 0.7, continuity: 0.5, money: 0.3, safety: 0.35, control: 0.3, reputation: 0.45 },
  user: { money: 0.5, fairness: 0.5, continuity: 0.5, safety: 0.4, control: 0.4, reputation: 0.3 },
  enterprise: { money: 0.5, fairness: 0.5, continuity: 0.7, safety: 0.5, control: 0.7, reputation: 0.7 },
};

export function inventActorMind(actor: Actor, rng: () => number): Mind {
  const values = { ...(ACTOR_VALUES[actor.kind] ?? ACTOR_VALUES.user!) };
  const personality: Personality = {
    lossAversion: actor.kind === "finance" || actor.kind === "sre" ? 2.4 + rng() * 0.8 : 1.8 + rng() * 1.0,
    riskTolerance: actor.kind === "pm" ? trait(rng, 0.7) : trait(rng, 0.35),
    statusQuoBias: actor.kind === "reviewer" || actor.kind === "finance" ? trait(rng, 0.7) : trait(rng, 0.4),
    priceSensitivity: actor.kind === "finance" ? 0.85 : trait(rng, 0.4),
    fairnessSensitivity: actor.kind === "reviewer" ? trait(rng, 0.75) : trait(rng, 0.5),
    patience: actor.kind === "pm" ? trait(rng, 0.25) : trait(rng, 0.55),
    loyalty: trait(rng, 0.5),
    trustBaseline: trait(rng, actor.kind === "attacker" ? 0.15 : 0.55),
    impulsivity: clamp01(actor.aggression * 0.7 + rng() * 0.2),
    conscientiousness: actor.kind === "sre" || actor.kind === "reviewer" ? trait(rng, 0.8) : trait(rng, 0.45),
  };

  return {
    id: `mind_${actor.id}`,
    role: actor.kind,
    name: actor.name,
    actorId: actor.id,
    personality,
    affect: {
      trust: personality.trustBaseline,
      anger: actor.aggression * 0.4,
      anxiety: actor.kind === "sre" || actor.kind === "finance" ? 0.45 + rng() * 0.25 : 0.25 + rng() * 0.3,
      satisfaction: 0.45,
      arousal: actor.aggression * 0.5,
    },
    memories: [
      {
        id: `mem_${actor.id}_0`,
        kind: "role",
        valence: actor.kind === "attacker" ? -0.2 : 0.2,
        salience: 0.7,
        summary: actor.stance,
      },
    ],
    referencePoint: 0.6,
    values,
  };
}

/** Buyer menu under a migration stimulus */
export function buyerOptions(mind: Mind, stim: WorldStimulus): DecisionOption[] {
  const d = stim.disruption;
  const bug = mind.memories.some((m) => m.kind === "legacy" && m.summary.startsWith("Depends on bug"));

  const opts: DecisionOption[] = [
    {
      id: "ignore",
      label: "Ignore the change",
      layer: "traffic",
      motive: "habit + loyalty outweigh perceived risk for now.",
      outcomes: [
        { dimension: "continuity", delta: -d.continuity * 0.15, probability: 0.7 },
        { dimension: "money", delta: -d.money * 0.1, probability: 0.4 },
      ],
    },
    {
      id: "wait_and_see",
      label: "Wait and watch the invoice",
      layer: "support",
      motive: "patience buys information; status quo still feels safe enough.",
      outcomes: [
        { dimension: "continuity", delta: -d.continuity * 0.25, probability: 0.6 },
        { dimension: "control", delta: 0.1, probability: 0.5 },
      ],
    },
    {
      id: "open_ticket",
      label: "Open a support ticket",
      layer: "support",
      motive: "fairness + anxiety demand a human acknowledgment.",
      outcomes: [
        { dimension: "fairness", delta: 0.25, probability: 0.55 },
        { dimension: "continuity", delta: -d.continuity * 0.35, probability: 0.7 },
        { dimension: "money", delta: -d.money * 0.2, probability: 0.45 },
      ],
    },
    {
      id: "escalate",
      label: "Escalate to SEV / account team",
      layer: "support",
      motive: "loss loom large; only escalation restores control.",
      outcomes: [
        { dimension: "control", delta: 0.35, probability: 0.5 },
        { dimension: "reputation", delta: 0.15, probability: 0.4 },
        { dimension: "continuity", delta: -d.continuity * 0.5, probability: 0.75 },
        { dimension: "money", delta: -d.money * 0.35, probability: 0.55 },
      ],
    },
    {
      id: "threaten_churn",
      label: "Threaten to churn",
      layer: "finance",
      motive: "price and fairness losses make exit option valuable.",
      outcomes: [
        { dimension: "money", delta: -d.money * 0.55, probability: 0.65 },
        { dimension: "fairness", delta: -d.fairness * 0.4, probability: 0.6 },
        { dimension: "control", delta: 0.4, probability: 0.55 },
      ],
    },
    {
      id: "churn",
      label: "Cancel / refuse renewal",
      layer: "finance",
      motive: "accumulated loss vs reference exceeds loyalty reserve.",
      outcomes: [
        { dimension: "money", delta: -0.7, probability: 0.8 },
        { dimension: "continuity", delta: -0.9, probability: 0.9 },
        { dimension: "control", delta: 0.5, probability: 0.7 },
      ],
    },
  ];

  if (bug) {
    opts.push({
      id: "exploit_bug",
      label: "Keep exploiting legacy bug behavior",
      layer: "legacy",
      motive: "the bug is part of their reference contract with the product.",
      outcomes: [
        { dimension: "money", delta: 0.35, probability: 0.7 },
        { dimension: "continuity", delta: d.continuity > 0.4 ? -0.6 : 0.2, probability: 0.75 },
        { dimension: "fairness", delta: 0.1, probability: 0.4 },
      ],
    });
  }

  return opts;
}

export function actorOptions(mind: Mind, stim: WorldStimulus): DecisionOption[] {
  const d = stim.disruption;
  switch (mind.role) {
    case "pm":
      return [
        {
          id: "scope_creep",
          label: "Change the spec mid-flight",
          layer: "product",
          motive: "shipping narrative + control outweigh continuity risk.",
          outcomes: [
            { dimension: "control", delta: 0.45, probability: 0.7 },
            { dimension: "reputation", delta: 0.3, probability: 0.55 },
            { dimension: "continuity", delta: -d.continuity * 0.4, probability: 0.6 },
            { dimension: "safety", delta: -0.25, probability: 0.5 },
          ],
        },
        {
          id: "hold_scope",
          label: "Hold scope, defer polish",
          layer: "product",
          motive: "conscientiousness briefly wins over launch anxiety.",
          outcomes: [
            { dimension: "safety", delta: 0.25, probability: 0.6 },
            { dimension: "reputation", delta: -0.15, probability: 0.45 },
            { dimension: "control", delta: -0.1, probability: 0.4 },
          ],
        },
        {
          id: "demand_flags",
          label: "Demand more feature flags",
          layer: "product",
          motive: "wants optionality without admitting fear.",
          outcomes: [
            { dimension: "control", delta: 0.3, probability: 0.65 },
            { dimension: "safety", delta: 0.2, probability: 0.55 },
            { dimension: "continuity", delta: 0.1, probability: 0.5 },
          ],
        },
      ];
    case "sre":
      return [
        {
          id: "page",
          label: "Page on error-budget burn",
          layer: "sre",
          motive: "safety value + anxiety; silence feels negligent.",
          outcomes: [
            { dimension: "safety", delta: 0.4, probability: 0.7 },
            { dimension: "reputation", delta: 0.2, probability: 0.5 },
            { dimension: "continuity", delta: -0.15, probability: 0.4 },
          ],
        },
        {
          id: "demand_rollback",
          label: "Demand kill-switch / rollback",
          layer: "sre",
          motive: "loss aversion on outage risk beats PM schedule.",
          outcomes: [
            { dimension: "safety", delta: 0.55, probability: 0.75 },
            { dimension: "control", delta: 0.25, probability: 0.6 },
            { dimension: "reputation", delta: -0.1, probability: 0.35 },
          ],
        },
        {
          id: "watch",
          label: "Watch dashboards, hold page",
          layer: "infra",
          motive: "patience + trust in agent mitigations.",
          outcomes: [
            { dimension: "safety", delta: -d.safety * 0.3, probability: 0.5 },
            { dimension: "continuity", delta: 0.15, probability: 0.55 },
          ],
        },
      ];
    case "finance":
      return [
        {
          id: "block_close",
          label: "Block month-end close",
          layer: "finance",
          motive: "orphan invoices are an existential money-loss vs reference close.",
          outcomes: [
            { dimension: "money", delta: 0.5, probability: 0.6 },
            { dimension: "reputation", delta: 0.25, probability: 0.5 },
            { dimension: "continuity", delta: -0.35, probability: 0.55 },
          ],
        },
        {
          id: "tax_alarm",
          label: "Raise tax remittance alarm",
          layer: "finance",
          motive: "fairness + money; VAT mismatch feels personally career-threatening.",
          outcomes: [
            { dimension: "money", delta: 0.4, probability: 0.65 },
            { dimension: "fairness", delta: 0.3, probability: 0.55 },
            { dimension: "control", delta: 0.15, probability: 0.45 },
          ],
        },
        {
          id: "approve",
          label: "Conditionally approve close path",
          layer: "finance",
          motive: "agent dual-write evidence nearly restores reference.",
          outcomes: [
            { dimension: "money", delta: -d.money * 0.2, probability: 0.45 },
            { dimension: "continuity", delta: 0.2, probability: 0.55 },
          ],
        },
      ];
    case "reviewer":
      return [
        {
          id: "block_pr",
          label: "Block PR — need chaos proof",
          layer: "security",
          motive: "conscientiousness; idempotency gaps feel like unfair future pages.",
          outcomes: [
            { dimension: "safety", delta: 0.5, probability: 0.7 },
            { dimension: "fairness", delta: 0.25, probability: 0.5 },
            { dimension: "reputation", delta: 0.15, probability: 0.4 },
          ],
        },
        {
          id: "request_dual_write",
          label: "Request dual-write evidence",
          layer: "legacy",
          motive: "status-quo bias wants continuity receipts.",
          outcomes: [
            { dimension: "continuity", delta: 0.35, probability: 0.65 },
            { dimension: "safety", delta: 0.25, probability: 0.55 },
          ],
        },
        {
          id: "approve",
          label: "Approve with comments",
          layer: "product",
          motive: "trust in mitigations crosses threshold.",
          outcomes: [
            { dimension: "safety", delta: -d.safety * 0.25, probability: 0.4 },
            { dimension: "reputation", delta: 0.1, probability: 0.45 },
          ],
        },
      ];
    case "attacker":
      return [
        {
          id: "replay_webhook",
          label: "Replay invoice webhooks",
          layer: "security",
          motive: "hunts missing idempotency — weakness is opportunity.",
          outcomes: [
            { dimension: "control", delta: 0.55, probability: 0.7 },
            { dimension: "money", delta: 0.35, probability: 0.5 },
            { dimension: "safety", delta: -0.6, probability: 0.8 },
          ],
        },
        {
          id: "forge_tax",
          label: "Forge tax IDs on self-serve",
          layer: "security",
          motive: "fairness inverted; disruption opens fraud surface.",
          outcomes: [
            { dimension: "money", delta: 0.4, probability: 0.55 },
            { dimension: "fairness", delta: -0.5, probability: 0.7 },
          ],
        },
        {
          id: "race_refund",
          label: "Race refund vs access revoke",
          layer: "security",
          motive: "arousal + aggression; timing bugs pay.",
          outcomes: [
            { dimension: "money", delta: 0.45, probability: 0.6 },
            { dimension: "control", delta: 0.3, probability: 0.55 },
            { dimension: "safety", delta: -0.45, probability: 0.65 },
          ],
        },
      ];
    default:
      return buyerOptions(mind, stim);
  }
}

export function hydrateMinds(users: SyntheticUser[], actors: Actor[], seed: number): Mind[] {
  const rng = createPrng(seed ^ 0x4d494e44);
  const minds: Mind[] = [];
  // Cap buyer minds simulated deeply; rest are represented statistically
  const sample = users.slice(0, Math.min(users.length, 80));
  for (const u of sample) {
    // Clone so rehearsals never mutate the town's stored minds
    const base = u.mind ?? inventBuyerMind(u, rng);
    minds.push(cloneMind(base));
  }
  for (const a of actors) {
    const base = a.mind ?? inventActorMind(a, rng);
    minds.push(cloneMind(base));
  }
  return minds;
}

function cloneMind(m: Mind): Mind {
  return {
    ...m,
    personality: { ...m.personality },
    affect: { ...m.affect },
    memories: m.memories.map((x) => ({ ...x })),
    values: { ...m.values },
  };
}

/** Salient choices become episodic memory — future decisions reference them */
export function recordEpisodicMemory(mind: Mind, decision: SubjectiveDecision, tick: number) {
  const salient = new Set([
    "escalate",
    "churn",
    "threaten_churn",
    "block_close",
    "demand_rollback",
    "page",
    "exploit_bug",
  ]);
  if (!salient.has(decision.optionId) && decision.utility < 0.35) return;

  const valence =
    decision.optionId === "churn" || decision.optionId === "demand_rollback"
      ? -0.75
      : decision.optionId === "exploit_bug"
        ? 0.5
        : -0.45;

  mind.memories.push({
    id: `mem_live_${tick}_${mind.id}`,
    kind: "rehearsal",
    valence,
    salience: 0.55 + decision.magnitude * 0.35,
    summary: `Rehearsal t${tick}: ${decision.label}`,
  });
  if (mind.memories.length > 6) {
    mind.memories.sort((a, b) => b.salience - a.salience);
    mind.memories.length = 6;
  }
}

/** Soften disruption when agent mitigations match what minds need */
export function mitigationRelief(mitigations: string[], mind: Mind): number {
  let relief = 0;
  const blob = mitigations.join(" ").toLowerCase();
  if (blob.includes("dual-write") && mind.personality.statusQuoBias > 0.5) relief += 0.12;
  if (blob.includes("idempotency") && (mind.role === "sre" || mind.role === "reviewer" || mind.role === "attacker"))
    relief += 0.14;
  if (blob.includes("legacy") && mind.memories.some((m) => m.summary.includes("Depends on bug"))) relief += 0.2;
  if (blob.includes("kill-switch") && mind.role === "sre") relief += 0.15;
  if (blob.includes("feature-flag") && mind.role === "pm") relief += 0.1;
  if (blob.includes("finance") && mind.role === "finance") relief += 0.16;
  return relief;
}

export function applyMitigationToMind(mind: Mind, mitigations: string[]) {
  const relief = mitigationRelief(mitigations, mind);
  if (relief <= 0) return;
  mind.affect.trust = clamp01(mind.affect.trust + relief * 0.5);
  mind.affect.anxiety = clamp01(mind.affect.anxiety - relief * 0.4);
  mind.affect.anger = clamp01(mind.affect.anger - relief * 0.25);
  mind.affect.arousal = clamp01(mind.affect.arousal - relief * 0.2);
}

export function cohortStats(minds: Mind[]) {
  const buyers = minds.filter((m) => m.role === "buyer");
  const n = buyers.length || 1;
  return {
    meanTrust: buyers.reduce((s, m) => s + m.affect.trust, 0) / n,
    meanAnger: buyers.reduce((s, m) => s + m.affect.anger, 0) / n,
    meanAnxiety: buyers.reduce((s, m) => s + m.affect.anxiety, 0) / n,
    churnReady: buyers.filter((m) => m.affect.anger > 0.65 && m.affect.trust < 0.35).length,
    lowTrust: buyers.filter((m) => m.affect.trust < 0.4).length,
  };
}

/** Pick who acts this tick — high arousal / low trust more likely */
export function sampleActorsForTick(minds: Mind[], count: number, rng: () => number): Mind[] {
  const weighted = minds.map((m) => ({
    m,
    w:
      0.15 +
      m.affect.arousal * 0.9 +
      m.affect.anger * 0.7 +
      (1 - m.affect.trust) * 0.6 +
      (m.role !== "buyer" ? 0.45 : 0) +
      m.personality.impulsivity * 0.3,
  }));
  const chosen: Mind[] = [];
  const pool = [...weighted];
  for (let i = 0; i < count && pool.length; i++) {
    const sum = pool.reduce((s, x) => s + x.w, 0);
    let r = rng() * sum;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx]!.w;
      if (r <= 0) break;
    }
    idx = Math.min(idx, pool.length - 1);
    chosen.push(pool[idx]!.m);
    pool.splice(idx, 1);
  }
  return chosen;
}
