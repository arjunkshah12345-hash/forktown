import { nanoid } from "nanoid";
import type { RepoFingerprint } from "../github/fingerprint";
import { agentCounterMove, applyCounterToMinds } from "./agent-counters";
import {
  detectTippingPoints,
  hottestDistrict,
  nearMissNote,
  segmentPulses,
} from "./analysis";
import { buildCast, evaluateHypothesis } from "./quality";
import {
  applySocialContagion,
  bumpWorldFromLayer,
  openTicketFromDecision,
  propagateDistrictStress,
} from "./cascade";
import { negotiate } from "./dialogue";
import {
  actorOptions,
  applyMitigationToMind,
  buyerOptions,
  cohortStats,
  decide,
  hydrateMinds,
  recordEpisodicMemory,
  sampleActorsForTick,
  type Mind,
  type WorldStimulus,
} from "./mind";
import { createPrng, int, pick } from "./prng";
import { phaseForTick, phaseLabel, scenarioBeat, type SimulationPhase } from "./scenarios";
import type {
  DialogueTurn,
  District,
  DistrictSnap,
  MigrationKind,
  PhaseSummary,
  PressureEvent,
  PressureLayer,
  RehearsalPlan,
  RehearsalRun,
  ScenarioBeat,
  SurvivalReport,
  Town,
  TrustCurvePoint,
  WorldSnapshot,
} from "./types";

const AGENT_MOVES: Record<MigrationKind, string[]> = {
  billing: [
    "Dual-write old + new path with shadow compare",
    "Feature-flag cohort: 5% → 25% → 100%",
    "Backfill job with checkpoint + resume",
    "Idempotency keys on all money mutations",
    "Read-repair for mismatched ledger rows",
    "Kill-switch rollback to previous adapter",
    "Contract tests against synthetic finance close",
    "Preserve legacy bug behind explicit opt-in flag",
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
  ],
};

function cloneWorld(w: WorldSnapshot): WorldSnapshot {
  return { ...w };
}

function scoreAgentMove(move: string, kind: MigrationKind, fp?: RepoFingerprint | null): number {
  const m = move.toLowerCase();
  let score = 0.35;
  if (kind === "billing") {
    if (/dual-write|idempotency|finance|read-repair|legacy/i.test(m)) score += 0.35;
    if (fp?.hasStripe && /idempotency|dual-write/i.test(m)) score += 0.2;
    if (fp?.hasWebhooks && /idempotency|shadow/i.test(m)) score += 0.15;
  }
  if (kind === "auth") {
    if (/shadow|session|kill-switch|flag|mfa/i.test(m)) score += 0.35;
    if (fp?.hasClerk || fp?.hasNextAuth) score += /shadow|cookie/i.test(m) ? 0.15 : 0;
  }
  if (kind === "database") {
    if (/backfill|expand|checkpoint|read-repair|lock/i.test(m)) score += 0.35;
    if (fp?.hasPrisma || fp?.hasDrizzle) score += /expand|backfill/i.test(m) ? 0.15 : 0;
  }
  if (kind === "framework" && /flag|canary|compat|rollback/i.test(m)) score += 0.3;
  if (kind === "api_version" && /shadow|deprec|idempotency|flag/i.test(m)) score += 0.3;
  if (/kill-switch|feature-flag/i.test(m)) score += 0.12;
  return score;
}

function selectAgentMoves(
  kind: MigrationKind,
  fp: RepoFingerprint | null | undefined,
  rng: () => number,
): string[] {
  const pool = AGENT_MOVES[kind];
  const ranked = pool
    .map((move) => ({ move, score: scoreAgentMove(move, kind, fp) + rng() * 0.25 }))
    .sort((a, b) => b.score - a.score);
  const count = 4 + Math.floor(rng() * 3);
  const picks = ranked.slice(0, count).map((r) => r.move);
  // Ensure at least one high-value mitigation
  const top = ranked[0]?.move;
  if (top && !picks.includes(top)) picks[picks.length - 1] = top;
  return picks;
}

function disruptionFor(
  kind: MigrationKind,
  intensity: number,
  world: WorldSnapshot,
  fp?: RepoFingerprint | null,
) {
  const base = 0.15 + intensity * 0.08;
  const outage = world.outagePercent / 100;
  const byKind: Record<MigrationKind, WorldStimulus["disruption"]> = {
    billing: {
      continuity: base + 0.2,
      money: base + 0.28,
      fairness: base + 0.18,
      safety: base + 0.08 + outage,
      control: base + 0.12,
    },
    auth: {
      continuity: base + 0.25,
      money: base + 0.05,
      fairness: base + 0.1,
      safety: base + 0.3 + outage,
      control: base + 0.22,
    },
    database: {
      continuity: base + 0.3,
      money: base + 0.12,
      fairness: base + 0.08,
      safety: base + 0.25 + outage,
      control: base + 0.15,
    },
    framework: {
      continuity: base + 0.18,
      money: base + 0.05,
      fairness: base + 0.05,
      safety: base + 0.2 + outage,
      control: base + 0.1,
    },
    api_version: {
      continuity: base + 0.22,
      money: base + 0.1,
      fairness: base + 0.12,
      safety: base + 0.15 + outage,
      control: base + 0.2,
    },
  };
  const d = byKind[kind];
  if (fp?.hasStripe) {
    d.money = Math.min(1, d.money + 0.08);
    d.fairness = Math.min(1, d.fairness + 0.06);
  }
  if (fp?.hasWebhooks) d.continuity = Math.min(1, d.continuity + 0.1);
  if (fp?.hasAuth && kind === "auth") d.safety = Math.min(1, d.safety + 0.08);
  if (fp?.hasMigrations && kind === "database") d.continuity = Math.min(1, d.continuity + 0.1);
  if (world.legacyContracts > 40) {
    d.continuity = Math.min(1, d.continuity + 0.06);
    d.money = Math.min(1, d.money + 0.05);
  }
  return d;
}

function applyDecisionImpact(
  world: WorldSnapshot,
  layer: PressureLayer,
  magnitude: number,
  intensity: number,
  optionId: string,
): WorldSnapshot {
  const next = cloneWorld(world);
  const v = magnitude * (0.55 + intensity * 0.12);

  switch (layer) {
    case "traffic":
      next.trafficRps = Math.round(next.trafficRps * (1 + v * 0.25));
      break;
    case "support":
      next.activeTickets = Math.round(next.activeTickets + v * 10);
      if (optionId === "escalate") next.activeIncidents += 1;
      break;
    case "finance":
      next.revenueAtRisk = Math.round(next.revenueAtRisk * (1 + v * 0.28));
      if (optionId === "churn" || optionId === "threaten_churn") {
        next.revenueAtRisk = Math.round(next.revenueAtRisk * (1 + v * 0.2));
      }
      if (optionId === "block_close") next.activeIncidents += 1;
      break;
    case "security":
      next.activeIncidents += 1;
      next.outagePercent = Math.min(48, +(next.outagePercent + v * 2.2).toFixed(1));
      break;
    case "sre":
      next.activeIncidents += 1;
      next.outagePercent = Math.min(48, +(next.outagePercent + v * 3.5).toFixed(1));
      break;
    case "product":
      next.activeTickets = Math.round(next.activeTickets + v * 5);
      break;
    case "legacy":
      next.legacyContracts = Math.round(next.legacyContracts * (1 + v * 0.08));
      next.revenueAtRisk = Math.round(next.revenueAtRisk * (1 + v * 0.18));
      break;
    case "infra":
      next.outagePercent = Math.min(50, +(next.outagePercent + v * 4).toFixed(1));
      next.trafficRps = Math.round(next.trafficRps * (1 - v * 0.12));
      break;
  }

  // Calm choices slightly heal
  if (optionId === "ignore" || optionId === "wait_and_see" || optionId === "approve" || optionId === "watch" || optionId === "hold_scope") {
    next.outagePercent = Math.max(0, +(next.outagePercent - 0.4).toFixed(1));
  }

  next.tick += 1;
  return next;
}

function judge(
  plan: RehearsalPlan,
  town: Town,
  events: PressureEvent[],
  final: WorldSnapshot,
  agentActions: string[],
  minds: Mind[],
  trustCurve: TrustCurvePoint[],
  scenarioBeats: ScenarioBeat[],
  counterMoves: string[],
): SurvivalReport {
  const layers: PressureLayer[] = [
    "traffic",
    "support",
    "finance",
    "security",
    "sre",
    "product",
    "legacy",
    "infra",
  ];

  const layerHits: Record<PressureLayer, number> = Object.fromEntries(
    layers.map((l) => [l, 0]),
  ) as Record<PressureLayer, number>;
  for (const e of events) {
    for (const [k, v] of Object.entries(e.impact)) {
      layerHits[k as PressureLayer] += v ?? 0;
    }
  }

  const stats = cohortStats(minds);
  const skill = Math.min(1, (agentActions.length + Math.min(5, counterMoves.length) * 0.6) / 6);
  const intensityPenalty = plan.intensity * 0.028;
  const trustBonus = (stats.meanTrust - 0.42) * 0.4;
  const angerPenalty = stats.meanAnger * 0.24;
  const churnPenalty = Math.min(0.28, stats.churnReady / 28);
  const outagePenalty = Math.min(0.28, final.outagePercent / 100);
  const coverageBonus = Math.min(0.12, counterMoves.length * 0.015);

  const dimensions = layers.map((layer) => {
    const hit = layerHits[layer];
    const base = 0.92 - hit * 0.085 - intensityPenalty;
    const rescue = skill * 0.2 + trustBonus + coverageBonus;
    let score = base + rescue - angerPenalty * 0.35;
    if (layer === "finance") score -= churnPenalty;
    if (layer === "legacy") score -= Math.min(0.18, town.world.legacyContracts / 110);
    if (layer === "support") score -= stats.meanAnger * 0.12;
    if (layer === "sre" && counterMoves.some((m) => /kill-switch/i.test(m))) score += 0.08;
    if (layer === "security" && agentActions.some((m) => /idempotency/i.test(m))) score += 0.06;
    score = Math.max(0.05, Math.min(0.99, score));
    const note =
      score > 0.75
        ? "Minds stayed below action threshold"
        : score > 0.5
          ? "Subjective strain — recoverable"
          : "Cohort utilities flipped hostile";
    return { layer, score: +score.toFixed(3), note };
  });

  const overall =
    dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length -
    outagePenalty * 0.3 -
    churnPenalty * 0.35 +
    coverageBonus * 0.5;
  const overallClamped = +Math.max(0, Math.min(1, overall)).toFixed(3);

  const cascadingFailures: string[] = [];
  if (final.outagePercent > 12) cascadingFailures.push("Outage bleed into checkout path");
  if (final.activeTickets > town.world.activeTickets * 2.2)
    cascadingFailures.push("Support queue runaway from angry minds");
  if (final.revenueAtRisk > town.world.revenueAtRisk * 1.8)
    cascadingFailures.push("Finance close at risk — money-loss aversion fired");
  if (stats.churnReady >= 8) cascadingFailures.push("Churn-intent cluster (anger↑ trust↓)");
  if (stats.meanTrust < 0.32) cascadingFailures.push("Town-wide trust below reference");
  if (dimensions.find((d) => d.layer === "security")!.score < 0.5)
    cascadingFailures.push("Attacker utilities found an open surface");

  const decisiveMoments = events
    .filter((e) => e.decision && e.decision.utility > 0.35)
    .slice(0, 8)
    .map((e) => e.decision!.rationale);

  const phaseSummaries: PhaseSummary[] = (["prepare", "canary", "cutover", "stress", "recovery"] as SimulationPhase[]).map(
    (phase) => {
      const pts = trustCurve.filter((p) => p.phase === phase);
      const phaseEvents = events.filter((e) => e.phase === phase).length;
      const trustStart = pts[0]?.meanTrust ?? trustCurve[0]?.meanTrust ?? 0;
      const trustEnd = pts[pts.length - 1]?.meanTrust ?? trustStart;
      return {
        phase,
        events: phaseEvents,
        trustStart: +trustStart.toFixed(3),
        trustEnd: +trustEnd.toFixed(3),
        trustDelta: +(trustEnd - trustStart).toFixed(3),
      };
    },
  );

  const survived = overallClamped >= 0.58 && cascadingFailures.length <= 3 && stats.meanTrust >= 0.26;

  const stressPhase = phaseSummaries.find((p) => p.phase === "stress");
  const recoveryPhase = phaseSummaries.find((p) => p.phase === "recovery");
  const trustRecovered = recoveryPhase && stressPhase ? recoveryPhase.trustEnd >= stressPhase.trustEnd - 0.05 : true;

  const tippingPoints = detectTippingPoints(trustCurve);
  const segments = segmentPulses(minds);
  const hot = hottestDistrict(events);
  const draft = {
    survived: survived && trustRecovered,
    overall: overallClamped,
    cascadingFailures,
  };
  const nearMiss = nearMissNote(draft);
  const allMoves = [...agentActions, ...counterMoves];
  const hypothesis = evaluateHypothesis(plan.kind, plan.hypothesis, allMoves, {
    survived: draft.survived,
    overall: overallClamped,
    cascadingFailures,
    subjective: {
      meanTrust: +stats.meanTrust.toFixed(3),
      meanAnger: +stats.meanAnger.toFixed(3),
      churnReady: stats.churnReady,
      decisiveMoments,
    },
  });
  const cast = buildCast(events, minds);
  const fidelity = +Math.min(
    1,
    0.35 +
      Math.min(0.25, events.filter((e) => e.kind === "scenario").length * 0.05) +
      Math.min(0.2, (trustCurve.length / 20) * 0.2) +
      Math.min(0.15, cast.length * 0.025) +
      (counterMoves.length ? 0.05 : 0) +
      hypothesis.coverage * 0.1,
  ).toFixed(3);

  return {
    survived: survived && trustRecovered,
    overall: overallClamped,
    dimensions,
    cascadingFailures,
    agentActions: allMoves.slice(0, agentActions.length + 4),
    verdict: survived
      ? trustRecovered
        ? "Subjective town held. Minds' utilities stayed shippable — canary + kill-switch."
        : "Town survived outage but trust did not recover in-window — extend canary."
      : "Subjective town collapsed the change. Buyer/actor utilities went hostile.",
    recommendation: survived
      ? trustRecovered
        ? "Promote behind a 5% canary. Keep dual-write one billing cycle. Watch trust + churn-intent pulse."
        : "Hold at 25% cohort. Add read-repair + finance contract tests before full cutover."
      : hypothesis.missing.length
        ? `Add missing mitigations (${hypothesis.missing.slice(0, 3).join(", ")}) and re-run colder.`
        : "Address the decisive moments below — especially loss-averse buyers and finance reference points — then re-run colder.",
    subjective: {
      meanTrust: +stats.meanTrust.toFixed(3),
      meanAnger: +stats.meanAnger.toFixed(3),
      churnReady: stats.churnReady,
      decisiveMoments,
    },
    trustCurve,
    phaseSummaries,
    scenarioBeats,
    tippingPoints,
    segments,
    nearMiss,
    hottestDistrictId: hot?.districtId ?? null,
    counterMoves,
    hypothesis,
    cast,
    fidelity,
  };
}

function optionsFor(mind: Mind, stim: WorldStimulus) {
  if (mind.role === "buyer") return buyerOptions(mind, stim);
  return actorOptions(mind, stim);
}

export function simulateRehearsal(
  town: Town,
  plan: RehearsalPlan,
  opts?: { ticks?: number; fingerprint?: RepoFingerprint | null },
): RehearsalRun {
  const fp = opts?.fingerprint ?? null;
  const ticks = opts?.ticks ?? 16 + plan.intensity * 3;
  const rng = createPrng(town.seed ^ hashString(plan.id) ^ 0x53454e53);
  const minds = hydrateMinds(town.users, town.actors, town.seed);
  const events: PressureEvent[] = [];
  const snapshots: WorldSnapshot[] = [];
  const liveLog: string[] = [];
  const allDialogue: DialogueTurn[] = [];
  const trustCurve: TrustCurvePoint[] = [];
  const scenarioBeatsLog: ScenarioBeat[] = [];
  const seenBeats = new Set<string>();
  const counterMoves: string[] = [];
  const districtSnaps: DistrictSnap[] = [];
  let districts: District[] = town.districts.map((d) => ({ ...d }));
  let tickets = [...town.tickets];

  const agentActions = selectAgentMoves(plan.kind, fp, rng);
  let liveMitigations = [...agentActions];

  liveLog.push(`Town ${town.name} online · seed ${town.seed}`);
  liveLog.push(`Hydrated ${minds.length} subjective minds (prospect theory + affect + memory)`);
  if (fp) {
    liveLog.push(
      `Repo fingerprint: ${fp.filesSampled} files · billing=${fp.hasBilling} auth=${fp.hasAuth} migrations=${fp.hasMigrations}`,
    );
  }
  liveLog.push(`Agent “${plan.agentName}” enters rehearsal: ${plan.title}`);
  liveLog.push(`Hypothesis: ${plan.hypothesis}`);
  liveLog.push(`Phases: prepare → canary → cutover → stress → recovery (${ticks} ticks)`);
  for (const a of agentActions.slice(0, 4)) {
    liveLog.push(`Agent move → ${a}`);
  }

  let world = cloneWorld(town.world);
  const stats0 = cohortStats(minds);
  world.meanTrust = +stats0.meanTrust.toFixed(3);
  world.meanAnger = +stats0.meanAnger.toFixed(3);
  world.churnIntent = stats0.churnReady;
  snapshots.push(cloneWorld(world));

  let lastPhase: SimulationPhase | null = null;
  let activeBoost: {
    continuity?: number;
    money?: number;
    fairness?: number;
    safety?: number;
    control?: number;
  } = {};

  for (let t = 1; t <= ticks; t++) {
    const phase = phaseForTick(t, ticks);

    if (phase !== lastPhase) {
      lastPhase = phase;
      liveLog.push(`── ${phaseLabel(phase).toUpperCase()} ──`);
      allDialogue.push({
        speaker: "narrator",
        name: "Town",
        text: `Entering ${phaseLabel(phase)}. The town shifts posture.`,
        tone: phase === "stress" || phase === "cutover" ? "tense" : "calm",
      });
      const beat = scenarioBeat(phase, plan.kind, fp, rng, seenBeats);
      if (beat) {
        activeBoost = beat.boost ?? {};
        // Intensity scales beat pressure
        const scale = 0.75 + plan.intensity * 0.08;
        activeBoost = Object.fromEntries(
          Object.entries(activeBoost).map(([k, v]) => [k, (v ?? 0) * scale]),
        );
        scenarioBeatsLog.push({ phase: beat.phase, title: beat.title, detail: beat.detail });
        const district =
          town.districts.find((d) => d.kind === layerToDistrict(beat.layer)) ?? pick(rng, town.districts);
        world = bumpWorldFromLayer(world, beat.layer, 0.35 + plan.intensity * 0.04);
        districts = propagateDistrictStress(districts, district.id, 0.25 + plan.intensity * 0.03);

        events.push({
          id: nanoid(8),
          tick: t,
          layer: beat.layer,
          title: beat.title,
          detail: beat.detail,
          impact: { [beat.layer]: 0.35 },
          districtId: district.id,
          phase,
          kind: "scenario",
          dialogue: [
            {
              speaker: "narrator",
              name: "Scenario",
              text: `${beat.title} — ${beat.detail}`,
              tone: phase === "recovery" ? "relieved" : "tense",
            },
          ],
        });
        liveLog.push(`t${t} · [${phaseLabel(phase)}] ${beat.title}`);
        liveLog.push(`     ${beat.detail}`);
      } else {
        activeBoost = {};
      }
    }

    const baseDisruption = disruptionFor(plan.kind, plan.intensity, world, fp);
    const stim: WorldStimulus = {
      tick: t,
      intensity: plan.intensity,
      migrationKind: plan.kind,
      outagePercent: world.outagePercent,
      activeTickets: world.activeTickets,
      revenueAtRisk: world.revenueAtRisk,
      agentMitigations: liveMitigations,
      disruption: {
        continuity: Math.max(0, Math.min(1, baseDisruption.continuity + (activeBoost.continuity ?? 0))),
        money: Math.max(0, Math.min(1, baseDisruption.money + (activeBoost.money ?? 0))),
        fairness: Math.max(0, Math.min(1, baseDisruption.fairness + (activeBoost.fairness ?? 0))),
        safety: Math.max(0, Math.min(1, baseDisruption.safety + (activeBoost.safety ?? 0))),
        control: Math.max(0, Math.min(1, baseDisruption.control + (activeBoost.control ?? 0))),
      },
    };

    if (t % 3 === 0) {
      const move = pick(rng, liveMitigations);
      for (const m of minds) applyMitigationToMind(m, [move, ...liveMitigations]);
      world.outagePercent = Math.max(0, +(world.outagePercent - 1.2 - rng()).toFixed(1));
      world.activeTickets = Math.max(0, world.activeTickets - int(rng, 1, 4));
      liveLog.push(`t${t} · agent mitigates → ${move} (minds update trust/anxiety)`);
    }

    // Auto kill-switch if outage breaches error budget mid-run
    if (world.outagePercent >= 14 && !liveMitigations.some((m) => /kill-switch/i.test(m))) {
      const ks = "Emergency kill-switch — adapter rolled back";
      liveMitigations.push(ks);
      counterMoves.push(ks);
      for (const m of minds) applyMitigationToMind(m, [ks]);
      world.outagePercent = Math.max(0, +(world.outagePercent - 4).toFixed(1));
      liveLog.push(`t${t} · ⚠ ERROR BUDGET BREACH → ${ks}`);
      events.push({
        id: nanoid(8),
        tick: t,
        layer: "sre",
        title: "Kill-switch fired",
        detail: ks,
        impact: { sre: 0.2 },
        phase,
        kind: "cascade",
      });
    }

    const actorCount =
      1 + Math.floor(plan.intensity / 2) + (phase === "stress" ? 1 : 0) + (phase === "cutover" ? 1 : 0);
    const actorsThisTick = sampleActorsForTick(minds, actorCount, rng);
    let tickWorld = world;

    for (const mind of actorsThisTick) {
      const personalStim = { ...stim, disruption: { ...stim.disruption } };
      if (mind.memories.some((m) => m.summary.startsWith("Depends on bug"))) {
        personalStim.disruption.continuity = Math.min(1, personalStim.disruption.continuity + 0.25);
        personalStim.disruption.money = Math.min(1, personalStim.disruption.money + 0.15);
      }
      if (phase === "stress") {
        personalStim.disruption.money = Math.min(1, personalStim.disruption.money + 0.08);
        personalStim.disruption.fairness = Math.min(1, personalStim.disruption.fairness + 0.06);
      }
      if (phase === "recovery") {
        personalStim.disruption.continuity = Math.max(0, personalStim.disruption.continuity - 0.12);
        personalStim.disruption.money = Math.max(0, personalStim.disruption.money - 0.08);
      }

      const decision = decide(mind, optionsFor(mind, personalStim), personalStim, rng);
      recordEpisodicMemory(mind, decision, t);
      const dialogue = negotiate(mind, decision, plan.agentName, liveMitigations, rng, { phase });
      allDialogue.push(...dialogue);

      const district =
        town.districts.find((d) => d.kind === layerToDistrict(decision.layer)) ??
        pick(rng, town.districts);

      tickWorld = applyDecisionImpact(
        tickWorld,
        decision.layer,
        decision.magnitude,
        plan.intensity,
        decision.optionId,
      );
      tickWorld = bumpWorldFromLayer(tickWorld, decision.layer, decision.magnitude * 0.5);
      districts = propagateDistrictStress(districts, district.id, decision.magnitude);

      const contagion = applySocialContagion(minds, mind, decision, rng);
      if (contagion > 0) {
        liveLog.push(`     ↳ social contagion · ${contagion} minds in ${mind.segment ?? mind.role} cohort`);
      }

      // Adaptive agent counter on hostile utilities
      if (decision.utility > 0.28 || decision.magnitude > 0.45) {
        const counter = agentCounterMove(decision, plan.agentName, liveMitigations, plan.kind, tickWorld);
        if (counter && rng() < 0.72) {
          liveMitigations.push(counter.move);
          counterMoves.push(counter.move);
          applyCounterToMinds(minds, decision, counter.move);
          dialogue.push(counter.dialogue);
          allDialogue.push(counter.dialogue);
          tickWorld = { ...tickWorld, ...counter.heal };
          liveLog.push(`     ↳ agent counter → ${counter.move}`);
        }
      }

      if (["open_ticket", "escalate"].includes(decision.optionId)) {
        tickets = openTicketFromDecision(
          tickets,
          district.id,
          `${decision.label} — ${mind.name}`,
          decision.magnitude > 0.55 ? "high" : "med",
        );
        tickWorld.activeTickets = tickets.filter((x) => x.open).length;
      }

      const ev: PressureEvent = {
        id: nanoid(8),
        tick: t,
        layer: decision.layer,
        title: decision.label,
        detail: decision.rationale,
        impact: { [decision.layer]: decision.magnitude },
        districtId: district.id,
        phase,
        kind: "decision",
        decision: {
          mindId: decision.mindId,
          mindName: decision.mindName,
          role: decision.role,
          optionId: decision.optionId,
          label: decision.label,
          utility: decision.utility,
          runnerUp: decision.runnerUp,
          rationale: decision.rationale,
          affectAfter: decision.affectAfter,
        },
        dialogue,
      };
      events.push(ev);
      liveLog.push(
        `t${t} · [${phaseLabel(phase)}] ${decision.mindName} → ${decision.label} (u=${decision.utility})`,
      );
      liveLog.push(`     ${truncate(decision.rationale, 160)}`);
      for (const turn of dialogue) {
        const tag = turn.speaker === "agent" ? "agent" : "mind";
        liveLog.push(`     [${tag}] ${turn.name}: ${truncate(turn.text, 120)}`);
      }
    }

    const stats = cohortStats(minds);
    tickWorld.meanTrust = +stats.meanTrust.toFixed(3);
    tickWorld.meanAnger = +stats.meanAnger.toFixed(3);
    tickWorld.churnIntent = stats.churnReady;
    tickWorld.tick = t;
    world = tickWorld;

    trustCurve.push({
      tick: t,
      phase,
      meanTrust: stats.meanTrust,
      meanAnger: stats.meanAnger,
      churnIntent: stats.churnReady,
      outagePercent: world.outagePercent,
    });
    snapshots.push(cloneWorld(world));
    districtSnaps.push({
      tick: t,
      districts: districts.map((d) => ({ id: d.id, health: +d.health.toFixed(3), load: +d.load.toFixed(3) })),
    });
  }

  const report = judge(plan, town, events, world, agentActions, minds, trustCurve, scenarioBeatsLog, counterMoves);
  liveLog.push(report.survived ? "SURVIVED — subjective town held." : "COLLAPSED — minds turned hostile.");
  liveLog.push(
    `Survivability ${(report.overall * 100).toFixed(1)}% · trust ${report.subjective?.meanTrust} · churn-ready ${report.subjective?.churnReady}`,
  );
  if (report.nearMiss) liveLog.push(`※ ${report.nearMiss}`);
  if (report.hypothesis) {
    liveLog.push(`Hypothesis: ${report.hypothesis.status.toUpperCase()} — ${report.hypothesis.summary}`);
  }
  if (report.fidelity != null) {
    liveLog.push(`Simulation fidelity ${(report.fidelity * 100).toFixed(0)}%`);
  }
  if (report.phaseSummaries?.length) {
    const worst = report.phaseSummaries.reduce((a, b) => (a.trustDelta < b.trustDelta ? a : b));
    liveLog.push(`Hardest phase: ${phaseLabel(worst.phase)} (trust Δ ${worst.trustDelta})`);
  }
  if (report.tippingPoints?.length) {
    liveLog.push(`Tipping points: ${report.tippingPoints.map((t) => t.summary).slice(0, 3).join(" · ")}`);
  }

  return {
    id: nanoid(12),
    planId: plan.id,
    townId: town.id,
    status: report.survived ? "survived" : "collapsed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ticks,
    events,
    snapshots,
    report,
    liveLog,
    dialogue: allDialogue,
    districtSnaps,
  };
}

function layerToDistrict(layer: PressureLayer): Town["districts"][0]["kind"] {
  const map: Record<PressureLayer, Town["districts"][0]["kind"]> = {
    traffic: "api",
    support: "support",
    finance: "finance",
    security: "security",
    sre: "edge",
    product: "billing",
    legacy: "data",
    infra: "api",
  };
  return map[layer];
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
