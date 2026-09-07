/**
 * Difficulty ladder calibration — the weapon must separate good plans from hollow ones.
 * Run: pnpm exec tsx scripts/calibrate-ladder.ts
 */
import { generateAcmeBillingTown } from "../src/lib/sim/world";
import { simulateRehearsal } from "../src/lib/sim/engine";
import type { RehearsalPlan } from "../src/lib/sim/types";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

const town = generateAcmeBillingTown();

function plan(intensity: 1 | 2 | 3 | 4 | 5): RehearsalPlan {
  return {
    id: `ladder_${intensity}`,
    townId: town.id,
    kind: "billing",
    title: "Ladder Stripe cutover",
    hypothesis: "Dual-write + cohort flags + kill-switch + idempotency hold under pressure.",
    agentName: "Forge",
    intensity,
    createdAt: new Date().toISOString(),
  };
}

console.log("Calibrating Forktown difficulty ladder…\n");

const rows: Array<{
  I: number;
  status: string;
  overall: number;
  cf: Array<{ a: string; d: number }>;
}> = [];

for (const intensity of [2, 3, 4, 5] as const) {
  const run = simulateRehearsal(town, plan(intensity));
  const cf = (run.report?.counterfactuals ?? []).map((c) => ({
    a: c.ablation,
    d: c.delta,
  }));
  rows.push({
    I: intensity,
    status: run.status,
    overall: run.report?.overall ?? 0,
    cf,
  });
  console.log(
    `I${intensity} ${run.status.padEnd(9)} ${(run.report!.overall * 100).toFixed(1)}%  cf=${cf
      .map((c) => `${c.a}:${(c.d * 100).toFixed(1)}`)
      .join(" ")}`,
  );
}

assert(rows[0]!.status === "survived", "I2 survives with full stack");
assert(rows[0]!.overall >= 0.58, "I2 overall ≥ 58%");
assert(rows.every((r) => r.cf.every((c) => c.d <= 0.005)), "all ablation deltas ≤ 0 across ladder");
assert(
  rows.every((r) => r.cf.some((c) => c.a === "no-dual-write" && c.d < -0.02)),
  "dual-write ablation hurts ≥2pts at every intensity",
);
assert(rows[1]!.cf.some((c) => c.a === "no-kill-switch" && c.d < 0), "I3 kill-switch is load-bearing");
assert(rows[2]!.overall < rows[0]!.overall, "I4 is harder than I2");
assert(rows[3]!.overall <= rows[2]!.overall + 0.02, "I5 not easier than I4");

// Hollow plan should collapse even at I2
const hollow = simulateRehearsal(town, plan(2), {
  forcedMitigations: ["Preserve legacy bug behind explicit opt-in flag"],
  skipCounterfactuals: true,
});
assert(hollow.status === "collapsed" || (hollow.report?.overall ?? 1) < 0.55, "hollow plan fails at I2");
console.log(
  `\nhollow I2 → ${hollow.status} ${((hollow.report?.overall ?? 0) * 100).toFixed(1)}%`,
);

if (failed) {
  console.error(`\n${failed} calibration check(s) failed`);
  process.exit(1);
}
console.log("\nLadder calibrated.");
