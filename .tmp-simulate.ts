export function simulateRehearsal(
  town: Town,
  plan: RehearsalPlan,
  opts?: {
    ticks?: number;
    fingerprint?: RepoFingerprint | null;
    /** Force a fixed mitigation set (skips agent planner) */
    forcedMitigations?: string[];
    /** Skip nested counterfactual runs */
    skipCounterfactuals?: boolean;
    maxBuyers?: number;
  },
): RehearsalRun {
  const fp = opts?.fingerprint ?? null;
  const ticks = opts?.ticks ?? 20 + plan.intensity * 4;
  const rng = createPrng(
    town.seed ^ hashString(plan.id) ^ 0x53454e53 ^ (opts?.forcedMitigations?.length ?? 0) * 13,
  );
  const maxBuyers = Math.min(town.users.length, opts?.maxBuyers ?? 90 + plan.intensity * 12);
  const minds = hydrateMinds(town.users, town.actors, town.seed, { maxBuyers });
  const beliefs = new Map(minds.map((m) => [m.id, beliefPrior(m)]));
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

  let world = cloneWorld(town.world);
  const stats0 = cohortStats(minds);
  world.meanTrust = +stats0.meanTrust.toFixed(3);
  world.meanAnger = +stats0.meanAnger.toFixed(3);
  world.churnIntent = stats0.churnReady;

  let opening = planAgentMoves(
    { kind: plan.kind, intensity: plan.intensity, world, fp, phase: "prepare" },
    rng,
    5 + Math.floor(plan.intensity / 2),
  );
  if (opts?.forcedMitigations?.length) {
    opening = {
      moves: [...opts.forcedMitigations],
      scores: opts.forcedMitigations.map((move) => ({ move, score: 1 })),
      topFeatures: opening.topFeatures,
      planScore: opening.planScore,
    };
  } else {
    opening.moves.sort(
      (a, b) =>
        lookaheadValue(b, { kind: plan.kind, intensity: plan.intensity, world, fp }) -
        lookaheadValue(a, { kind: plan.kind, intensity: plan.intensity, world, fp }),
    );
  }
  const agentActions = opening.moves;
  let liveMitigations = [...agentActions];
  let replanCount = 0;

  const entropyAcc: number[] = [];
  const gapAcc: number[] = [];
  const featureVotes = new Map<string, number>();

  liveLog.push(`Town ${town.name} online · seed ${town.seed}`);
  liveLog.push(
    `Hydrated ${minds.length} minds · ${MIND_NET_VERSION} (α=${MIND_ALPHA}) + prospect theory + affect + memory`,
  );
  liveLog.push(
    `Agent policy ${AGENT_NET_VERSION} · planScore ${opening.planScore} · coverage ${(mitigationCoverage(plan.kind, agentActions) * 100).toFixed(0)}%`,
  );
  if (fp) {
    liveLog.push(
      `Repo fingerprint: ${fp.filesSampled} files · billing=${fp.hasBilling} auth=${fp.hasAuth} migrations=${fp.hasMigrations}`,
    );
  }
  liveLog.push(`Agent “${plan.agentName}” enters rehearsal: ${plan.title}`);
  liveLog.push(`Hypothesis: ${plan.hypothesis}`);
  liveLog.push(`Phases: prepare → canary → cutover → stress → recovery (${ticks} ticks)`);
  for (const s of opening.scores.slice(0, 5)) {
    liveLog.push(`Agent net → ${s.move} (q=${s.score})`);
  }

  snapshots.push(cloneWorld(world));

  let lastPhase: SimulationPhase | null = null;
  let activeBoost: {
    continuity?: number;
    money?: number;
    fairness?: number;
    safety?: number;
    control?: number;
  } = {};
  let prevTrust = stats0.meanTrust;

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

      if (!opts?.forcedMitigations) {
        const phaseReplan = replanAgentMove(
          { kind: plan.kind, intensity: plan.intensity, world, fp, phase },
          liveMitigations,
        );
        if (phaseReplan && phaseReplan.score > 0.15) {
          liveMitigations.push(phaseReplan.move);
          counterMoves.push(phaseReplan.move);
          replanCount++;
          for (const m of minds) applyMitigationToMind(m, [phaseReplan.move]);
          liveLog.push(`t${t} · agent-net replan → ${phaseReplan.move} (${phaseReplan.reason})`);
        }
      }
    }

    const baseDisruption = disruptionFor(plan.kind, plan.intensity, world, fp);
    const boosted = {
      continuity: Math.max(0, Math.min(1, baseDisruption.continuity + (activeBoost.continuity ?? 0))),
      money: Math.max(0, Math.min(1, baseDisruption.money + (activeBoost.money ?? 0))),
      fairness: Math.max(0, Math.min(1, baseDisruption.fairness + (activeBoost.fairness ?? 0))),
      safety: Math.max(0, Math.min(1, baseDisruption.safety + (activeBoost.safety ?? 0))),
      control: Math.max(0, Math.min(1, baseDisruption.control + (activeBoost.control ?? 0))),
    };
    const shielded = applyMitigationShield(boosted, liveMitigations, plan.kind);

    const stim: WorldStimulus = {
      tick: t,
      intensity: plan.intensity,
      migrationKind: plan.kind,
      outagePercent: world.outagePercent,
      activeTickets: world.activeTickets,
      revenueAtRisk: world.revenueAtRisk,
      agentMitigations: liveMitigations,
      disruption: shielded,
    };

    if (t % 3 === 0) {
      const move = pick(rng, liveMitigations);
      for (const m of minds) applyMitigationToMind(m, [move, ...liveMitigations]);
      world.outagePercent = Math.max(0, +(world.outagePercent - 1.2 - rng()).toFixed(1));
      world.activeTickets = Math.max(0, world.activeTickets - int(rng, 1, 4));
      liveLog.push(`t${t} · agent mitigates → ${move} (minds update trust/anxiety)`);
    }

    const trustNow = world.meanTrust ?? prevTrust;
    if (
      !opts?.forcedMitigations &&
      (prevTrust - trustNow >= 0.05 || world.outagePercent >= 11) &&
      t % 2 === 0
    ) {
      const crisis = replanAgentMove(
        { kind: plan.kind, intensity: plan.intensity, world, fp, phase },
        liveMitigations,
      );
      if (crisis) {
        liveMitigations.push(crisis.move);
        counterMoves.push(crisis.move);
        replanCount++;
        for (const m of minds) applyMitigationToMind(m, [crisis.move]);
        world.outagePercent = Math.max(0, +(world.outagePercent - 1.5).toFixed(1));
        liveLog.push(`t${t} · ⚡ crisis replan → ${crisis.move} (${crisis.reason})`);
      }
    }
    prevTrust = trustNow;

    const cap = outageCap(liveMitigations, plan.intensity);
    if (world.outagePercent > cap) world.outagePercent = +cap.toFixed(1);

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
      2 +
      Math.floor(plan.intensity / 2) +
      (phase === "stress" ? 2 : 0) +
      (phase === "cutover" ? 1 : 0);
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

      if (decision.neural) {
        entropyAcc.push(decision.neural.entropy);
        gapAcc.push(Math.abs(decision.neural.neuralLogit - decision.neural.prospectEu));
        for (const f of decision.neural.topFeatures) {
          featureVotes.set(f.feature, (featureVotes.get(f.feature) ?? 0) + Math.abs(f.weight));
        }
      }

      const bel = beliefs.get(mind.id) ?? beliefPrior(mind);
      const survivedTick = !["churn", "demand_rollback", "block_close"].includes(decision.optionId);
      beliefs.set(
        mind.id,
        updateBelief(bel, mind.affect.trust, survivedTick, 0.16 + plan.intensity * 0.02),
      );

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

      if (decision.utility > 0.28 || decision.magnitude > 0.45) {
        const counter = agentCounterMove(decision, plan.agentName, liveMitigations, plan.kind, tickWorld);
        if (counter && rng() < 0.75) {
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
          neural: decision.neural,
        },
        dialogue,
      };
      events.push(ev);
      liveLog.push(
        `t${t} · [${phaseLabel(phase)}] ${decision.mindName} → ${decision.label} (u=${decision.utility})`,
      );
      liveLog.push(`     ${truncate(decision.rationale, 180)}`);
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
    const cap2 = outageCap(liveMitigations, plan.intensity);
    if (tickWorld.outagePercent > cap2) tickWorld.outagePercent = +cap2.toFixed(1);
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
      districts: districts.map((d) => ({
        id: d.id,
        health: +d.health.toFixed(3),
        load: +d.load.toFixed(3),
      })),
    });
  }

  const beliefVals = [...beliefs.values()];
  const meanExpectedTrust =
    beliefVals.reduce((s, b) => s + b.expectedTrust, 0) / (beliefVals.length || 1);
  const meanPSurvive = beliefVals.reduce((s, b) => s + b.pSurvive, 0) / (beliefVals.length || 1);
  const topFeatures = [...featureVotes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([feature, weight]) => ({ feature, weight: +weight.toFixed(4) }));

  const { WEIGHTS_V2 } = require("./neural/weights-v2") as typeof import("./neural/weights-v2");

  const { WEIGHTS_V2 } = require("./neural/weights-v2") as typeof import("./neural/weights-v2");

  const neuralTelemetry: SurvivalReport["neural"] = {
    mindPolicy: MIND_NET_VERSION,
    agentPolicy: AGENT_NET_VERSION,
    alpha: MIND_ALPHA,
    decisions: entropyAcc.length,
    meanPolicyEntropy: +(
      entropyAcc.reduce((a, b) => a + b, 0) / (entropyAcc.length || 1)
    ).toFixed(4),
    meanProspectGap: +(gapAcc.reduce((a, b) => a + b, 0) / (gapAcc.length || 1)).toFixed(4),
    topFeatures,
    agentPlanScore: opening.planScore,
    agentMovesRanked: opening.scores,
    replans: replanCount,
    beliefFinal: {
      meanExpectedTrust: +meanExpectedTrust.toFixed(3),
      meanPSurvive: +meanPSurvive.toFixed(3),
    },
    mitigationCoverage: +mitigationCoverage(plan.kind, liveMitigations).toFixed(3),
    weights: {
      mindR2: WEIGHTS_V2.mindR2,
      agentR2: WEIGHTS_V2.agentR2,
      version: WEIGHTS_V2.version,
    },
  };

  const report = judge(
    plan,
    town,
    events,
    world,
    agentActions,
    minds,
    trustCurve,
    scenarioBeatsLog,
    counterMoves,
    neuralTelemetry,
  );

  if (!opts?.skipCounterfactuals && !opts?.forcedMitigations) {
    const ablations: Array<{ id: string; re: RegExp }> = [
      { id: "no-dual-write", re: /dual-write/i },
      { id: "no-kill-switch", re: /kill-switch|rollback/i },
      { id: "no-idempotency", re: /idempotency/i },
    ];
    const cfs: NonNullable<SurvivalReport["counterfactuals"]> = [];
    for (const a of ablations) {
      const forced = agentActions.filter((m) => !a.re.test(m));
      if (forced.length === agentActions.length) continue;
      const cf = simulateRehearsal(town, plan, {
        ticks: Math.max(12, Math.floor(ticks * 0.5)),
        fingerprint: fp,
        forcedMitigations: forced,
        skipCounterfactuals: true,
        maxBuyers: Math.min(48, maxBuyers),
      });
      cfs.push({
        ablation: a.id,
        survived: Boolean(cf.report?.survived),
        overall: cf.report?.overall ?? 0,
        delta: +((cf.report?.overall ?? 0) - report.overall).toFixed(3),
      });
    }
    report.counterfactuals = cfs;
    if (cfs.length) {
      liveLog.push(
        `Counterfactuals: ${cfs.map((c) => `${c.ablation} Δ=${(c.delta * 100).toFixed(1)}pts`).join(" · ")}`,
      );
    }
  }

  liveLog.push(report.survived ? "SURVIVED — subjective town held." : "COLLAPSED — minds turned hostile.");
  liveLog.push(
    `Survivability ${(report.overall * 100).toFixed(1)}% · trust ${report.subjective?.meanTrust} · churn-ready ${report.subjective?.churnReady}`,
  );
  liveLog.push(
    `Neural · decisions ${neuralTelemetry.decisions} · H̄=${neuralTelemetry.meanPolicyEntropy} · belief p(survive)=${neuralTelemetry.beliefFinal.meanPSurvive} · replans ${replanCount}`,
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
    liveLog.push(`Tipping points: ${report.tippingPoints.map((tp) => tp.summary).slice(0, 3).join(" · ")}`);
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
