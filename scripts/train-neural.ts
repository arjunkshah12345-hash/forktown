/**
 * Offline neural trainer (Colab-equivalent, runs locally).
 * Supervised targets from behavioral oracles → SGD → checkpoint.
 *
 * Run: pnpm exec tsx scripts/train-neural.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMlp,
  cloneMlp,
  serializeMlp,
  trainStep,
  vec,
  forward,
  type MlpWeights,
} from "../src/lib/sim/neural/mlp";
import { createPrng } from "../src/lib/sim/prng";

const MIND_SIZES = [52, 64, 32, 1];
const AGENT_SIZES = [28, 48, 24, 1];

function mindEncode(
  angry: number,
  trust: number,
  anxiety: number,
  sq: number,
  loyalty: number,
  dCont: number,
  dMoney: number,
  dSafe: number,
  dual: number,
  idem: number,
  kill: number,
  flags: number,
  optHostile: number,
  optPassive: number,
  optAttack: number,
): Float64Array {
  const x = vec(52);
  // personality-ish
  x[0] = 0.5 + angry * 0.3;
  x[2] = sq;
  x[6] = loyalty;
  x[8] = angry * 0.6;
  // affect
  x[10] = trust;
  x[11] = angry;
  x[12] = anxiety;
  x[14] = angry * 0.5 + anxiety * 0.3;
  // values
  x[15] = 0.5 + dMoney * 0.3;
  x[17] = 0.5 + dCont * 0.3;
  x[18] = 0.4 + dSafe * 0.4;
  // disruption
  x[25] = dCont;
  x[26] = dMoney;
  x[28] = dSafe;
  x[33] = 0.6;
  // mitigations
  x[35] = dual;
  x[36] = idem;
  x[37] = kill;
  x[38] = flags;
  // option
  x[43] = optHostile;
  x[42] = optPassive;
  x[49] = optAttack;
  return x;
}

/** Oracle: hostile should score high when affect bad + disruption high + weak mitigations */
function mindTarget(x: Float64Array): number {
  const trust = x[10]!;
  const anger = x[11]!;
  const anxiety = x[12]!;
  const dCont = x[25]!;
  const dMoney = x[26]!;
  const dual = x[35]!;
  const kill = x[37]!;
  const hostile = x[43]!;
  const passive = x[42]!;
  const attack = x[49]!;

  let t = 0;
  if (hostile) {
    t = 0.15 + anger * 0.9 + anxiety * 0.5 + (1 - trust) * 0.7 + dCont * 0.4 + dMoney * 0.45;
    t -= dual * 0.55 + kill * 0.25;
  } else if (passive) {
    t = 0.35 + trust * 0.7 + (1 - anger) * 0.4 - dCont * 0.5 - dMoney * 0.35;
    t += dual * 0.35 + kill * 0.15;
  } else if (attack) {
    t = 0.2 + (1 - x[36]!) * 0.8 + dSafe(x) * 0.5;
  } else {
    t = 0.25 + anger * 0.3;
  }
  return Math.max(-0.5, Math.min(2.2, t));
}

function dSafe(x: Float64Array) {
  return x[28]!;
}

function agentEncode(
  outage: number,
  trust: number,
  anger: number,
  churn: number,
  intensity: number,
  stripe: number,
  webhooks: number,
  stress: number,
  moveDual: number,
  moveIdem: number,
  moveKill: number,
  moveFlags: number,
  moveShadow: number,
  moveLegacy: number,
): Float64Array {
  const x = vec(28);
  x[0] = outage;
  x[3] = trust;
  x[4] = anger;
  x[5] = churn;
  x[6] = intensity;
  x[8] = 1; // billing
  x[13] = stripe;
  x[14] = webhooks;
  x[19] = stress;
  x[21] = moveDual;
  x[22] = moveIdem;
  x[23] = moveKill;
  x[24] = moveFlags;
  x[26] = moveShadow;
  x[27] = moveLegacy;
  return x;
}

/** Oracle: rank core mitigations by crisis — dual-write/idem/kill beat vanity legacy preserve */
function agentTarget(x: Float64Array): number {
  const outage = x[0]!;
  const trust = x[3]!;
  const stripe = x[13]!;
  const webhooks = x[14]!;
  const dual = x[21]!;
  const idem = x[22]!;
  const kill = x[23]!;
  const flags = x[24]!;
  const shadow = x[26]!;
  const legacy = x[27]!;

  let t = 0.1;
  if (kill) t += 0.35 + outage * 0.9;
  if (dual) t += 0.45 + (1 - trust) * 0.7;
  if (idem) t += 0.4 + (stripe + webhooks) * 0.35;
  if (flags) t += 0.3 + (1 - trust) * 0.25;
  if (shadow) t += 0.28 + (1 - trust) * 0.2;
  if (legacy) t += 0.12 + (1 - trust) * 0.15; // useful but not top
  // Penalize legacy-only when crisis is acute
  if (legacy && !dual && !kill && outage > 0.2) t -= 0.25;
  return Math.max(0, Math.min(2.5, t));
}

function trainNet(
  name: string,
  sizes: number[],
  seed: number,
  samples: Array<{ x: Float64Array; y: number }>,
  epochs: number,
  lr: number,
): MlpWeights {
  const net = buildMlp({ name, version: "train", sizes }, seed, 0.45);
  const rng = createPrng(seed ^ 0x74726169);
  let loss = 0;
  for (let e = 0; e < epochs; e++) {
    loss = 0;
    // shuffle indices
    const idx = samples.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    }
    for (const i of idx) {
      const s = samples[i]!;
      loss += trainStep(net, s.x, s.y, lr);
    }
    loss /= samples.length;
    if (e % 20 === 0 || e === epochs - 1) {
      console.log(`  ${name} epoch ${e}: loss=${loss.toFixed(5)}`);
    }
  }
  return net;
}

function makeMindSamples(n: number, seed: number) {
  const rng = createPrng(seed);
  const out: Array<{ x: Float64Array; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const angry = rng();
    const trust = rng();
    const anxiety = rng();
    const sq = rng();
    const loyalty = rng();
    const dCont = rng();
    const dMoney = rng();
    const dSafe = rng();
    const dual = rng() > 0.45 ? 1 : 0;
    const idem = rng() > 0.5 ? 1 : 0;
    const kill = rng() > 0.55 ? 1 : 0;
    const flags = rng() > 0.4 ? 1 : 0;
    const kind = rng();
    const optHostile = kind < 0.4 ? 1 : 0;
    const optPassive = kind >= 0.4 && kind < 0.75 ? 1 : 0;
    const optAttack = kind >= 0.75 ? 1 : 0;
    const x = mindEncode(
      angry,
      trust,
      anxiety,
      sq,
      loyalty,
      dCont,
      dMoney,
      dSafe,
      dual,
      idem,
      kill,
      flags,
      optHostile,
      optPassive,
      optAttack,
    );
    out.push({ x, y: mindTarget(x) });
  }
  return out;
}

function makeAgentSamples(n: number, seed: number) {
  const rng = createPrng(seed);
  const out: Array<{ x: Float64Array; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const outage = rng();
    const trust = rng();
    const anger = rng();
    const churn = rng();
    const intensity = 0.2 + rng() * 0.8;
    const stripe = rng() > 0.4 ? 1 : 0;
    const webhooks = rng() > 0.45 ? 1 : 0;
    const stress = rng() > 0.6 ? 1 : 0;
    // one-hot-ish move type
    const pick = Math.floor(rng() * 6);
    const flags = [0, 0, 0, 0, 0, 0];
    flags[pick] = 1;
    const x = agentEncode(
      outage,
      trust,
      anger,
      churn,
      intensity,
      stripe,
      webhooks,
      stress,
      flags[0]!,
      flags[1]!,
      flags[2]!,
      flags[3]!,
      flags[4]!,
      flags[5]!,
    );
    out.push({ x, y: agentTarget(x) });
  }
  return out;
}

function evalCorr(net: MlpWeights, samples: Array<{ x: Float64Array; y: number }>) {
  let sse = 0;
  let sst = 0;
  const mean = samples.reduce((s, p) => s + p.y, 0) / samples.length;
  for (const s of samples) {
    const pred = forward(net, s.x).out[0]!;
    sse += (pred - s.y) ** 2;
    sst += (s.y - mean) ** 2;
  }
  return 1 - sse / (sst || 1);
}

console.log("Training Forktown neural policies (local SGD)…");
const mindSamples = makeMindSamples(4000, 0x4d494e44);
const agentSamples = makeAgentSamples(3500, 0x41474e54);
const mindHold = makeMindSamples(600, 99);
const agentHold = makeAgentSamples(500, 77);

const mindNet = trainNet("mind", MIND_SIZES, 0x4d494e44, mindSamples, 80, 0.012);
const agentNet = trainNet("agent", AGENT_SIZES, 0x41474e54, agentSamples, 90, 0.014);

const mindR2 = evalCorr(mindNet, mindHold);
const agentR2 = evalCorr(agentNet, agentHold);
console.log(`Holdout R² mind=${mindR2.toFixed(3)} agent=${agentR2.toFixed(3)}`);

const payload = {
  version: "ft-v2",
  trainedAt: new Date().toISOString(),
  mindR2: +mindR2.toFixed(4),
  agentR2: +agentR2.toFixed(4),
  mindSizes: MIND_SIZES,
  agentSizes: AGENT_SIZES,
  mind: serializeMlp(cloneMlp(mindNet)),
  agent: serializeMlp(cloneMlp(agentNet)),
};

const outPath = resolve("src/lib/sim/neural/weights-v2.ts");
const body = `/* AUTO-GENERATED by scripts/train-neural.ts — do not edit by hand */
export const WEIGHTS_V2 = ${JSON.stringify(payload)} as const;
`;
writeFileSync(outPath, body);
console.log(`Wrote ${outPath}`);
console.log("Done.");
