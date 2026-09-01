import type { Mind, SubjectiveDecision } from "./mind";
import { applyMitigationToMind } from "./mind";
import type { DialogueTurn, MigrationKind, WorldSnapshot } from "./types";

const HOSTILE = new Set([
  "escalate",
  "churn",
  "threaten_churn",
  "block_close",
  "demand_rollback",
  "page",
  "replay_webhook",
  "forge_tax",
  "race_refund",
  "block_pr",
  "scope_creep",
]);

/** Mid-rehearsal agent counter when a mind goes hostile */
export function agentCounterMove(
  decision: SubjectiveDecision,
  agentName: string,
  mitigations: string[],
  kind: MigrationKind,
  world: WorldSnapshot,
): { move: string; dialogue: DialogueTurn; heal: Partial<WorldSnapshot> } | null {
  if (!HOSTILE.has(decision.optionId)) return null;

  const blob = mitigations.join(" ").toLowerCase();
  let move: string;
  let text: string;

  if (decision.optionId === "page" || decision.optionId === "demand_rollback") {
    move = blob.includes("kill-switch")
      ? "Pull kill-switch — adapter rolled back in 40s"
      : "Emergency kill-switch armed + SRE bridge opened";
    text = `${agentName}: ${move}. Error budget first — narrative second.`;
  } else if (decision.optionId === "block_close" || decision.role === "finance") {
    move = "Finance close freeze + orphan-invoice scrub job";
    text = `${agentName}: Holding cutover. Running orphan-invoice scrub before close window.`;
  } else if (
    decision.optionId === "replay_webhook" ||
    decision.optionId === "forge_tax" ||
    decision.optionId === "race_refund"
  ) {
    move = "Idempotency gate + replay quarantine";
    text = `${agentName}: Quarantining replayed events. Idempotency keys enforced on money path.`;
  } else if (decision.optionId === "churn" || decision.optionId === "threaten_churn") {
    move = "Account holdout — exclude from remaining canary waves";
    text = `${agentName}: Your account is off the canary. Dual-write stays on for one full cycle.`;
  } else if (decision.optionId === "escalate" || decision.optionId === "open_ticket") {
    move = "Priority support lane + reference-bill compare";
    text = `${agentName}: Opening a priority lane. Shadow invoice compare attached to your ticket.`;
  } else if (decision.optionId === "block_pr") {
    move = "Chaos proof pack + dual-write receipts attached";
    text = `${agentName}: Attaching chaos receipts and dual-write diffs to the PR.`;
  } else if (decision.optionId === "scope_creep") {
    move = "Scope lock — flags only, no new surfaces";
    text = `${agentName}: Scope locked. Feature flags only — no new surfaces mid-cutover.`;
  } else {
    move =
      kind === "auth"
        ? "Session repair cohort + rollback ready"
        : "Canary brake — hold at current percent";
    text = `${agentName}: ${move}. Watching trust before the next wave.`;
  }

  const heal: Partial<WorldSnapshot> = {
    outagePercent: Math.max(0, +(world.outagePercent - 1.5).toFixed(1)),
    activeTickets: Math.max(0, world.activeTickets - 2),
  };

  return {
    move,
    dialogue: { speaker: "agent", name: agentName, text, tone: "tactical" },
    heal,
  };
}

export function applyCounterToMinds(minds: Mind[], decision: SubjectiveDecision, move: string) {
  const focus = minds.filter(
    (m) =>
      m.id === decision.mindId ||
      (decision.role === "buyer" && m.segment === minds.find((x) => x.id === decision.mindId)?.segment) ||
      m.role === decision.role,
  );
  for (const m of focus.slice(0, 12)) {
    applyMitigationToMind(m, [move]);
  }
}
