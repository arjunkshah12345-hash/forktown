/**
 * Forktown Mind Policy Net (ft-mind-v2)
 * Hybrid: U = α · prospectEU + (1-α) · neuralLogit
 * Weights from scripts/train-neural.ts (SGD on behavioral oracle).
 */

import type { DecisionOption, Mind, WorldStimulus } from "../mind";
import {
  attributeInput,
  buildMlp,
  entropy,
  forward,
  loadMlp,
  sigmoid,
  softmax,
  vec,
  type MlpWeights,
} from "./mlp";
import { WEIGHTS_V2 } from "./weights-v2";

export const MIND_NET_VERSION = "ft-mind-v2";
export const MIND_ALPHA = 0.45;

const STATE_DIM = 40;
const OPTION_DIM = 12;
const INPUT_DIM = STATE_DIM + OPTION_DIM; // 52

const FEATURE_NAMES: string[] = [
  // personality 0-9
  "lossAversion",
  "riskTolerance",
  "statusQuoBias",
  "priceSensitivity",
  "fairnessSensitivity",
  "patience",
  "loyalty",
  "trustBaseline",
  "impulsivity",
  "conscientiousness",
  // affect 10-14
  "trust",
  "anger",
  "anxiety",
  "satisfaction",
  "arousal",
  // values 15-20
  "v_money",
  "v_fairness",
  "v_continuity",
  "v_safety",
  "v_control",
  "v_reputation",
  // memory 21-24
  "memValence",
  "memSalience",
  "memLegacyBug",
  "memCount",
  // disruption 25-29
  "d_continuity",
  "d_money",
  "d_fairness",
  "d_safety",
  "d_control",
  // world 30-34
  "outage",
  "tickets",
  "revenueRisk",
  "intensity",
  "referencePoint",
  // mitigations 35-39
  "hasDualWrite",
  "hasIdempotency",
  "hasKillSwitch",
  "hasFlags",
  "hasLegacyPreserve",
  // option 40-51
  "opt_lossy",
  "opt_gainy",
  "opt_passive",
  "opt_hostile",
  "opt_money",
  "opt_fairness",
  "opt_continuity",
  "opt_safety",
  "opt_control",
  "opt_attack",
  "opt_finance",
  "opt_escalate",
];

let cachedNet: MlpWeights | null = null;

function mindNet(): MlpWeights {
  if (cachedNet) return cachedNet;
  try {
    cachedNet = loadMlp([...WEIGHTS_V2.mindSizes], WEIGHTS_V2.mind as unknown as number[][][]);
  } catch {
    cachedNet = buildMlp(
      { name: "mind-policy", version: MIND_NET_VERSION, sizes: [INPUT_DIM, 64, 32, 1] },
      0x4d494e44,
      0.55,
    );
  }
  return cachedNet;
}

function memStats(mind: Mind) {
  if (!mind.memories.length) return { valence: 0, salience: 0, legacy: 0 };
  let v = 0;
  let s = 0;
  let legacy = 0;
  for (const m of mind.memories) {
    v += m.valence * m.salience;
    s += m.salience;
    if (m.summary.startsWith("Depends on bug") || m.kind === "legacy") legacy = 1;
  }
  return { valence: s ? v / s : 0, salience: s / mind.memories.length, legacy };
}

function encodeState(mind: Mind, stim: WorldStimulus): Float64Array {
  const p = mind.personality;
  const a = mind.affect;
  const mem = memStats(mind);
  const blob = stim.agentMitigations.join(" ").toLowerCase();
  const x = vec(STATE_DIM);
  const vals = [
    (p.lossAversion - 1.5) / 2.5,
    p.riskTolerance,
    p.statusQuoBias,
    p.priceSensitivity,
    p.fairnessSensitivity,
    p.patience,
    p.loyalty,
    p.trustBaseline,
    p.impulsivity,
    p.conscientiousness,
    a.trust,
    a.anger,
    a.anxiety,
    a.satisfaction,
    a.arousal,
    mind.values.money ?? 0.5,
    mind.values.fairness ?? 0.5,
    mind.values.continuity ?? 0.5,
    mind.values.safety ?? 0.5,
    mind.values.control ?? 0.5,
    mind.values.reputation ?? 0.5,
    (mem.valence + 1) / 2,
    mem.salience,
    mem.legacy,
    Math.min(1, mind.memories.length / 6),
    stim.disruption.continuity,
    stim.disruption.money,
    stim.disruption.fairness,
    stim.disruption.safety,
    stim.disruption.control,
    Math.min(1, stim.outagePercent / 40),
    Math.min(1, stim.activeTickets / 80),
    Math.min(1, stim.revenueAtRisk / 200_000),
    stim.intensity / 5,
    mind.referencePoint,
    blob.includes("dual-write") ? 1 : 0,
    blob.includes("idempotency") ? 1 : 0,
    /kill-switch|rollback/.test(blob) ? 1 : 0,
    /feature-flag|cohort|canary/.test(blob) ? 1 : 0,
    /legacy|preserve/.test(blob) ? 1 : 0,
  ];
  for (let i = 0; i < STATE_DIM; i++) x[i] = vals[i] ?? 0;
  return x;
}

const HOSTILE = new Set([
  "escalate",
  "churn",
  "threaten_churn",
  "open_ticket",
  "page",
  "block_pr",
  "block_close",
  "demand_rollback",
  "replay_webhook",
  "forge_tax",
  "race_refund",
  "scope_creep",
]);
const PASSIVE = new Set(["ignore", "wait_and_see", "approve", "watch", "hold_scope"]);

function encodeOption(option: DecisionOption, mind: Mind): Float64Array {
  const lossy = option.outcomes.reduce((s, o) => s + Math.min(0, o.delta), 0);
  const gainy = option.outcomes.reduce((s, o) => s + Math.max(0, o.delta), 0);
  const byDim = (d: string) =>
    option.outcomes.filter((o) => o.dimension === d).reduce((s, o) => s + o.delta * o.probability, 0);
  const x = vec(OPTION_DIM);
  const vals = [
    Math.min(1, Math.abs(lossy)),
    Math.min(1, gainy),
    PASSIVE.has(option.id) ? 1 : 0,
    HOSTILE.has(option.id) ? 1 : 0,
    byDim("money"),
    byDim("fairness"),
    byDim("continuity"),
    byDim("safety"),
    byDim("control"),
    mind.role === "attacker" ? 1 : 0,
    option.layer === "finance" ? 1 : 0,
    option.id.includes("escalat") || option.id === "page" ? 1 : 0,
  ];
  for (let i = 0; i < OPTION_DIM; i++) x[i] = vals[i] ?? 0;
  return x;
}

export interface NeuralScore {
  logit: number;
  euBlend: number;
  probs: number[];
  entropy: number;
  topFeatures: Array<{ feature: string; weight: number }>;
  attribution: Array<{ feature: string; weight: number }>;
}

/**
 * Score options with hybrid EU + neural. Returns neural diagnostics for the chosen path.
 */
export function scoreOptionsNeural(
  mind: Mind,
  options: DecisionOption[],
  stim: WorldStimulus,
  prospectUtilities: number[],
): { scores: number[]; neural: NeuralScore } {
  const net = mindNet();
  const state = encodeState(mind, stim);
  const logits: number[] = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const oEnc = encodeOption(opt, mind);
    const input = vec(INPUT_DIM);
    for (let j = 0; j < STATE_DIM; j++) input[j] = state[j]!;
    for (let j = 0; j < OPTION_DIM; j++) input[STATE_DIM + j] = oEnc[j]!;

    const { out } = forward(net, input);
    // Domain residual shaping — neural alone is not enough; bake behavioral physics
    let logit = out[0]!;
    const eu = prospectUtilities[i] ?? 0;
    // Hostile options get neural boost when affect is bad
    if (HOSTILE.has(opt.id)) {
      logit += mind.affect.anger * 0.55 + mind.affect.anxiety * 0.35 + (1 - mind.affect.trust) * 0.45;
      logit -= mind.personality.loyalty * 0.3 + mind.personality.patience * 0.25;
    }
    if (PASSIVE.has(opt.id)) {
      logit += mind.personality.statusQuoBias * 0.4 + mind.affect.trust * 0.35;
      logit -= stim.disruption.continuity * 0.25 + stim.outagePercent * 0.01;
    }
    if (mind.role === "attacker" && /replay|forge|race/.test(opt.id)) {
      logit += stim.disruption.safety * 0.5 + (1 - Number(stim.agentMitigations.join(" ").toLowerCase().includes("idempotency"))) * 0.4;
    }
    // Blend with prospect EU (normalized-ish)
    const blended = MIND_ALPHA * eu + (1 - MIND_ALPHA) * logit;
    logits.push(blended);
  }

  const probs = softmax(logits);
  const bestIdx = probs.reduce((bi, p, i, arr) => (p > arr[bi]! ? i : bi), 0);
  const bestOpt = options[bestIdx]!;
  const oEnc = encodeOption(bestOpt, mind);
  const input = vec(INPUT_DIM);
  for (let j = 0; j < STATE_DIM; j++) input[j] = state[j]!;
  for (let j = 0; j < OPTION_DIM; j++) input[STATE_DIM + j] = oEnc[j]!;
  const topFeatures = attributeInput(net, input, FEATURE_NAMES, 6);

  return {
    scores: logits,
    neural: {
      logit: +logits[bestIdx]!.toFixed(4),
      euBlend: +((prospectUtilities[bestIdx] ?? 0)).toFixed(4),
      probs,
      entropy: +entropy(probs).toFixed(4),
      topFeatures,
      attribution: topFeatures,
    },
  };
}

/** Softmax sample using neural scores (temperature from arousal) */
export function neuralSoftmaxPick(
  scores: number[],
  temperature: number,
  rng: () => number,
): number {
  const t = Math.max(0.05, temperature);
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < exps.length; i++) {
    r -= exps[i]!;
    if (r <= 0) return i;
  }
  return scores.length - 1;
}

export function beliefPrior(mind: Mind): { expectedTrust: number; pSurvive: number } {
  return {
    expectedTrust: mind.affect.trust,
    pSurvive: sigmoid(mind.affect.trust * 2.2 - mind.affect.anger * 1.6 - mind.affect.anxiety * 0.8),
  };
}

/** Bayesian-ish belief update after observing a decision outcome */
export function updateBelief(
  belief: { expectedTrust: number; pSurvive: number },
  observedTrust: number,
  survivedTick: boolean,
  lr = 0.18,
): { expectedTrust: number; pSurvive: number } {
  return {
    expectedTrust: belief.expectedTrust * (1 - lr) + observedTrust * lr,
    pSurvive: belief.pSurvive * (1 - lr) + (survivedTick ? 1 : 0) * lr,
  };
}
