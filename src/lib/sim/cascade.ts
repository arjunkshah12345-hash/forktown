import type { Mind, SubjectiveDecision } from "./mind";
import { clamp01 } from "./mind-utils";
import type { District, PressureLayer, Ticket, WorldSnapshot } from "./types";

const HOSTILE_OPTIONS = new Set([
  "open_ticket",
  "escalate",
  "threaten_churn",
  "churn",
  "page",
  "block_pr",
  "block_close",
  "demand_rollback",
  "replay_webhook",
  "forge_tax",
  "race_refund",
  "scope_creep",
]);

/** Stress propagates to dependent districts */
export function propagateDistrictStress(
  districts: District[],
  districtId: string,
  magnitude: number,
): District[] {
  const origin = districts.find((d) => d.id === districtId);
  if (!origin) return districts;

  return districts.map((d) => {
    if ( d.id === districtId) {
      return {
        ...d,
        load: clamp01(d.load + magnitude * 0.35),
        health: clamp01(d.health - magnitude * 0.22),
      };
    }
    const isDep = origin.dependencies.includes(d.id) || d.dependencies.includes(origin.id);
    const sameKind = d.kind === origin.kind;
    if (!isDep && !sameKind) return d;
    const factor = isDep ? 0.45 : 0.22;
    return {
      ...d,
      load: clamp01(d.load + magnitude * factor * 0.25),
      health: clamp01(d.health - magnitude * factor * 0.15),
    };
  });
}

/** Angry minds in same segment feel the ripple */
export function applySocialContagion(
  minds: Mind[],
  actor: Mind,
  decision: SubjectiveDecision,
  rng: () => number,
): number {
  if (!HOSTILE_OPTIONS.has(decision.optionId)) return 0;
  const contagionStrength =
    decision.magnitude * (0.35 + actor.affect.anger * 0.4) * (actor.role === "buyer" ? 1 : 0.65);
  if (contagionStrength < 0.08) return 0;

  let affected = 0;
  for (const m of minds) {
    if (m.id === actor.id) continue;
    const sameSegment = actor.segment && m.segment === actor.segment;
    const sameRole = m.role === actor.role;
    const proximity = sameSegment ? 0.55 : sameRole ? 0.35 : 0.12;
    if (rng() > proximity * contagionStrength) continue;

    m.affect.anger = clamp01(m.affect.anger + contagionStrength * 0.18);
    m.affect.trust = clamp01(m.affect.trust - contagionStrength * 0.12);
    m.affect.anxiety = clamp01(m.affect.anxiety + contagionStrength * 0.1);
    m.affect.arousal = clamp01(m.affect.arousal + contagionStrength * 0.08);
    affected += 1;
  }
  return affected;
}

export function bumpWorldFromLayer(
  world: WorldSnapshot,
  layer: PressureLayer,
  magnitude: number,
): WorldSnapshot {
  const next = { ...world };
  switch (layer) {
    case "support":
      next.activeTickets = Math.round(next.activeTickets + magnitude * 8);
      break;
    case "finance":
      next.revenueAtRisk = Math.round(next.revenueAtRisk * (1 + magnitude * 0.15));
      break;
    case "security":
    case "sre":
      next.activeIncidents = Math.round(next.activeIncidents + magnitude * 0.8);
      next.outagePercent = Math.min(50, +(next.outagePercent + magnitude * 2.5).toFixed(1));
      break;
    case "traffic":
      next.trafficRps = Math.round(next.trafficRps * (1 + magnitude * 0.12));
      break;
    case "legacy":
      next.legacyContracts = Math.round(next.legacyContracts * (1 + magnitude * 0.05));
      break;
    default:
      break;
  }
  return next;
}

export function openTicketFromDecision(
  tickets: Ticket[],
  districtId: string,
  subject: string,
  severity: Ticket["severity"],
): Ticket[] {
  return [
    ...tickets,
    {
      id: `t_sim_${tickets.length}`,
      subject,
      severity,
      districtId,
      open: true,
    },
  ];
}
