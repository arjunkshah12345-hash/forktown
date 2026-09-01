/**
 * Deterministic simulation self-test.
 * Run: pnpm exec tsx scripts/sim-selftest.ts
 */
import { generateAcmeBillingTown } from "../src/lib/sim/world";
import { simulateRehearsal } from "../src/lib/sim/engine";
import { prospectValue, weightProb, decide, inventBuyerMind, buyerOptions } from "../src/lib/sim/mind";
import { createPrng } from "../src/lib/sim/prng";
import { phaseForTick } from "../src/lib/sim/scenarios";
import type { RehearsalPlan, SyntheticUser } from "../src/lib/sim/types";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

// Prospect theory basics
assert(prospectValue(1, 2.25) > 0, "gains positive");
assert(prospectValue(-1, 2.25) < -2, "losses amplified by λ");
assert(weightProb(0.05) > 0.05, "small probs overweight");

// Phase map covers full arc
assert(phaseForTick(1, 20) === "prepare", "early prepare");
assert(phaseForTick(10, 20) === "cutover" || phaseForTick(10, 20) === "canary", "mid phases");
assert(phaseForTick(20, 20) === "recovery", "late recovery");

// Softmax decision is deterministic for seed
const rng = createPrng(42);
const user: SyntheticUser = {
  id: "u_test",
  name: "Test Buyer",
  segment: "legacy",
  planId: "plan_pro",
  billingState: "past_due",
  anger: 0.6,
  dependsOnBug: "double-apply coupon on retry",
};
const mind = inventBuyerMind(user, rng);
const stim = {
  tick: 1,
  intensity: 4,
  migrationKind: "billing" as const,
  outagePercent: 5,
  activeTickets: 20,
  revenueAtRisk: 10000,
  agentMitigations: ["Dual-write old + new path with shadow compare"],
  disruption: { continuity: 0.5, money: 0.6, fairness: 0.4, safety: 0.2, control: 0.3 },
};
const d1 = decide(mind, buyerOptions(mind, stim), stim, createPrng(99));
const mind2 = inventBuyerMind(user, createPrng(42));
const d2 = decide(mind2, buyerOptions(mind2, stim), stim, createPrng(99));
assert(d1.optionId === d2.optionId, "decide is seed-deterministic");
assert(typeof d1.rationale === "string" && d1.rationale.length > 20, "rationale present");

// Full rehearsal
const town = generateAcmeBillingTown();
const plan: RehearsalPlan = {
  id: "plan_selftest",
  townId: town.id,
  kind: "billing",
  title: "Selftest Stripe cutover",
  hypothesis: "Dual-write + cohort flags + kill-switch should survive subjective town pressure.",
  agentName: "Forge",
  intensity: 4,
  createdAt: new Date().toISOString(),
};
const runA = simulateRehearsal(town, plan);
const runB = simulateRehearsal(town, plan);

assert(runA.status === runB.status, "same seed → same status");
assert(runA.ticks === runB.ticks, "same ticks");
assert(runA.events.length === runB.events.length, "same event count");
assert(runA.report!.overall === runB.report!.overall, "same survivability");
assert((runA.report!.scenarioBeats?.length ?? 0) >= 3, "has scenario beats");
assert((runA.report!.phaseSummaries?.length ?? 0) === 5, "five phase summaries");
assert(!!runA.report!.hypothesis, "hypothesis verdict present");
assert((runA.report!.cast?.length ?? 0) >= 1, "decisive cast present");
assert((runA.report!.fidelity ?? 0) >= 0.4, "fidelity floor");
assert(runA.districtSnaps!.length === runA.ticks, "district snaps per tick");
assert(runA.liveLog.some((l) => l.includes("──")), "phase headers in log");

console.log("\nSample run:", {
  status: runA.status,
  overall: runA.report!.overall,
  hypothesis: runA.report!.hypothesis?.status,
  fidelity: runA.report!.fidelity,
  events: runA.events.length,
  cast: runA.report!.cast?.map((c) => c.name),
});

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll self-tests passed.");
