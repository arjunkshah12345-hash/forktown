/**
 * Negotiation dialogue — agent and subjective minds talk past / with each other.
 * Lines are chosen from templates scored against mind affect + agent mitigations,
 * not random flavor text alone.
 */

import type { Mind, SubjectiveDecision } from "./mind";
import { mitigationRelief } from "./mind";
import type { DialogueTurn } from "./types";

function scoreLine(
  weights: { anger?: number; trust?: number; anxiety?: number; relief?: number; hostile?: number },
  mind: Mind,
  relief: number,
): number {
  let s = 0.2;
  s += (weights.anger ?? 0) * mind.affect.anger;
  s += (weights.trust ?? 0) * mind.affect.trust;
  s += (weights.anxiety ?? 0) * mind.affect.anxiety;
  s += (weights.relief ?? 0) * relief;
  s += (weights.hostile ?? 0) * (1 - mind.affect.trust) * mind.affect.anger;
  return s;
}

function pickBest<T extends { score: number }>(items: T[]): T {
  return items.reduce((a, b) => (b.score > a.score ? b : a));
}

export function negotiate(
  mind: Mind,
  decision: SubjectiveDecision,
  agentName: string,
  mitigations: string[],
  rng: () => number,
  opts?: { phase?: string },
): DialogueTurn[] {
  const relief = mitigationRelief(mitigations, mind);
  const turns: DialogueTurn[] = [];
  const phase = opts?.phase ?? "";
  const bug =
    mind.memories.find((m) => m.summary.startsWith("Depends on bug"))?.summary.replace("Depends on bug: ", "") ??
    "the weird edge that somehow works";
  const mem = mind.memories.slice().sort((a, b) => b.salience - a.salience)[0];

  const mindLines: Array<{ text: string; tone: DialogueTurn["tone"]; score: number }> = [
    {
      text: `You picked “${decision.label}”. I hear you — but my reference point for “normal” hasn't moved yet.`,
      tone: "tense",
      score:
        scoreLine({ anger: 0.5, anxiety: 0.35 }, mind, relief) +
        (decision.optionId === "open_ticket" || decision.optionId === "escalate" ? 0.35 : 0.1),
    },
    {
      text: `You're breaking the thing I depend on: ${bug}. Fix that or I'm gone.`,
      tone: "hostile",
      score:
        scoreLine({ hostile: 0.8, anger: 0.5 }, mind, relief) +
        (decision.optionId === "exploit_bug" || decision.optionId === "churn" || decision.optionId === "threaten_churn"
          ? 0.5
          : 0),
    },
    {
      text: `Finance can't close with orphan invoices. Sacred calendar. Not negotiable.`,
      tone: "hostile",
      score: scoreLine({ anxiety: 0.7, anger: 0.3 }, mind, relief) + (mind.role === "finance" ? 0.9 : -1),
    },
    {
      text: `Error budget is already smoking. Show me the kill-switch or I page.`,
      tone: "tense",
      score: scoreLine({ anxiety: 0.8 }, mind, relief) + (mind.role === "sre" ? 0.85 : -1),
    },
    {
      text: `Ship Friday is the story. Flags are fine — just don't make me look like I slipped the date.`,
      tone: "tactical",
      score: scoreLine({ trust: 0.3, anxiety: 0.4 }, mind, relief) + (mind.role === "pm" ? 0.85 : -1),
    },
    {
      text: `Idempotency or I block. Chaos tests or I block. Dual-write receipts or I block.`,
      tone: "tense",
      score: scoreLine({ anxiety: 0.5, trust: -0.2 }, mind, relief) + (mind.role === "reviewer" ? 0.9 : -1),
    },
    {
      text: `Webhook replay window looks juicy. Don't mind me.`,
      tone: "hostile",
      score: scoreLine({ hostile: 0.5 }, mind, relief) + (mind.role === "attacker" ? 0.95 : -1),
    },
    {
      text: `I'll wait one cycle. Loyalty's not infinite — but I'm not punching out yet.`,
      tone: "calm",
      score:
        scoreLine({ trust: 0.7, anger: -0.4 }, mind, relief) +
        (decision.optionId === "wait_and_see" || decision.optionId === "ignore" ? 0.55 : 0),
    },
    {
      text: `If your canary keeps my reference bill identical, I stay quiet. That's the deal.`,
      tone: "calm",
      score: scoreLine({ trust: 0.6, relief: 0.5 }, mind, relief) + mind.personality.loyalty * 0.3,
    },
    {
      text: `Enterprise procurement will notice this. SLA credit or we escalate to legal.`,
      tone: "hostile",
      score:
        scoreLine({ anger: 0.55, hostile: 0.4 }, mind, relief) +
        (mind.segment === "enterprise" ? 0.75 : -1) +
        (decision.optionId === "threaten_churn" || decision.optionId === "escalate" ? 0.25 : 0),
    },
    {
      text: `Legacy plan still works. Every “upgrade” I've seen cost me money or features.`,
      tone: "tense",
      score:
        scoreLine({ anger: 0.4, anxiety: 0.4 }, mind, relief) +
        (mind.segment === "legacy" ? 0.8 : -1) +
        mind.personality.statusQuoBias * 0.3,
    },
    {
      text: `Cutover phase and you're still talking flags? Either ship the kill-switch or freeze.`,
      tone: "hostile",
      score: scoreLine({ anxiety: 0.6, anger: 0.35 }, mind, relief) + (phase === "cutover" || phase === "stress" ? 0.55 : -0.2),
    },
    {
      text: mem
        ? `I still remember: “${mem.summary}”. That memory is louder than your rollout email.`
        : `My last bad invoice still sits in working memory.`,
      tone: "tense",
      score: scoreLine({ anger: 0.45, anxiety: 0.3 }, mind, relief) + (mem && mem.valence < 0 ? 0.45 : 0.1),
    },
    {
      text: `Recovery window — show me the next invoice matches reference or I'm out.`,
      tone: "tense",
      score: scoreLine({ trust: 0.3, anxiety: 0.4 }, mind, relief) + (phase === "recovery" ? 0.7 : -1),
    },
  ];

  const mindPick = pickBest(mindLines.filter((l) => l.score > 0));
  turns.push({
    speaker: "mind",
    name: mind.name,
    text: mindPick.text,
    tone: mindPick.tone,
  });

  const agentLines: Array<{ text: string; tone: DialogueTurn["tone"]; score: number }> = [
    {
      text: `${agentName}: Keeping your legacy behavior behind an explicit flag. Dual-write compares shadow invoices before cutover.`,
      tone: "tactical",
      score: 0.4 + relief + (mitigations.some((m) => /legacy|dual-write/i.test(m)) ? 0.5 : 0),
    },
    {
      text: `${agentName}: Kill-switch is live. One page and we roll back the adapter — no heroics.`,
      tone: "relieved",
      score: 0.35 + (mind.role === "sre" ? 0.5 : 0) + (mitigations.some((m) => /kill-switch/i.test(m)) ? 0.45 : 0),
    },
    {
      text: `${agentName}: Cohort is 5% → 25%. Your account isn't in the first wave unless you opt in.`,
      tone: "calm",
      score: 0.3 + mind.personality.statusQuoBias * 0.4 + (mitigations.some((m) => /flag|cohort/i.test(m)) ? 0.4 : 0),
    },
    {
      text: `${agentName}: Idempotency keys on every money mutation. Replay won't double-charge.`,
      tone: "tactical",
      score:
        0.3 +
        (mind.role === "attacker" || mind.role === "reviewer" || mind.role === "finance" ? 0.45 : 0.1) +
        (mitigations.some((m) => /idempotency/i.test(m)) ? 0.5 : 0),
    },
    {
      text: `${agentName}: Finance close contract test is in the suite — orphan invoices fail the rehearsal, not prod.`,
      tone: "tactical",
      score: 0.25 + (mind.role === "finance" ? 0.6 : 0) + (mitigations.some((m) => /finance/i.test(m)) ? 0.4 : 0),
    },
    {
      text: `${agentName}: Heard. Logging your reference point. If trust dips below threshold we freeze the rollout.`,
      tone: "calm",
      score: 0.2 + (1 - mind.affect.trust) * 0.3 + rng() * 0.1,
    },
  ];

  const agentPick = pickBest(agentLines);
  turns.push({
    speaker: "agent",
    name: agentName,
    text: agentPick.text,
    tone: agentPick.tone,
  });

  // Counter from mind — do they buy it?
  const persuaded = relief + mind.affect.trust * 0.4 + mind.personality.loyalty * 0.25 > 0.55 + mind.affect.anger * 0.35;
  if (persuaded) {
    turns.push({
      speaker: "mind",
      name: mind.name,
      text:
        mind.role === "attacker"
          ? `Fine. Surface looks tighter. I'll try something else.`
          : `…Alright. Don't make me regret trusting the canary.`,
      tone: "relieved",
    });
    mind.affect.trust = Math.min(1, mind.affect.trust + 0.04 + relief * 0.08);
    mind.affect.anger = Math.max(0, mind.affect.anger - 0.03);
  } else {
    turns.push({
      speaker: "mind",
      name: mind.name,
      text:
        mind.affect.anger > 0.55
          ? `Words aren't utility. My losses still loom larger than your flags.`
          : `Maybe. I'm watching the next invoice like a hawk.`,
      tone: mind.affect.anger > 0.55 ? "hostile" : "tense",
    });
  }

  return turns;
}
