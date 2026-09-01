import type { RepoFingerprint } from "../github/fingerprint";
import { pick } from "./prng";
import type { MigrationKind, PressureLayer } from "./types";

export type SimulationPhase = "prepare" | "canary" | "cutover" | "stress" | "recovery";

export interface ScenarioBeat {
  phase: SimulationPhase;
  title: string;
  detail: string;
  layer: PressureLayer;
  /** Extra disruption injected this beat */
  boost: {
    continuity?: number;
    money?: number;
    fairness?: number;
    safety?: number;
    control?: number;
  };
}

export function phaseForTick(tick: number, totalTicks: number): SimulationPhase {
  const p = tick / totalTicks;
  if (p <= 0.18) return "prepare";
  if (p <= 0.38) return "canary";
  if (p <= 0.58) return "cutover";
  if (p <= 0.82) return "stress";
  return "recovery";
}

const BEATS: Record<MigrationKind, Record<SimulationPhase, Omit<ScenarioBeat, "phase">[]>> = {
  billing: {
    prepare: [
      {
        title: "Finance freeze window opens",
        detail: "Month-end close is 72h out. Orphan invoices are career-threatening.",
        layer: "finance",
        boost: { money: 0.12, control: 0.08 },
      },
      {
        title: "Shadow compare queue fills",
        detail: "Dual-write path warming. Legacy coupon ghosts still in prod traffic.",
        layer: "legacy",
        boost: { continuity: 0.1, fairness: 0.06 },
      },
    ],
    canary: [
      {
        title: "5% cohort sees new invoice shape",
        detail: "First wave hits enterprise accounts with custom line items.",
        layer: "finance",
        boost: { money: 0.14, fairness: 0.1 },
      },
      {
        title: "Webhook delivery skew",
        detail: "Stripe events arrive out of order on the canary path.",
        layer: "traffic",
        boost: { continuity: 0.12, safety: 0.08 },
      },
    ],
    cutover: [
      {
        title: "Checkout adapter flip",
        detail: "Primary write path moves. Refund race window opens for 90 seconds.",
        layer: "finance",
        boost: { money: 0.22, safety: 0.14 },
      },
      {
        title: "Tax remittance mismatch",
        detail: "EU VAT rounded differently on new path — finance minds spike.",
        layer: "finance",
        boost: { money: 0.18, fairness: 0.15 },
      },
    ],
    stress: [
      {
        title: "Double-charge reports cluster",
        detail: "Support queue doubles. Angry buyers reference last year's incident.",
        layer: "support",
        boost: { fairness: 0.2, money: 0.16, continuity: 0.12 },
      },
      {
        title: "Attacker replays webhook batch",
        detail: "Missing idempotency key on legacy endpoint — red team moves.",
        layer: "security",
        boost: { safety: 0.25, money: 0.12 },
      },
    ],
    recovery: [
      {
        title: "Read-repair sweep",
        detail: "Agent reconciles ledger drift. Trust slowly recovers if mitigations landed.",
        layer: "infra",
        boost: { continuity: -0.08, money: -0.06 },
      },
      {
        title: "Churn-intent cooling",
        detail: "Threatened accounts wait for next invoice cycle before deciding.",
        layer: "support",
        boost: { fairness: -0.05 },
      },
    ],
  },
  auth: {
    prepare: [
      {
        title: "Session store shadow mode",
        detail: "Tokens issued beside legacy cookies. Mobile clients still on old path.",
        layer: "traffic",
        boost: { continuity: 0.14, safety: 0.1 },
      },
    ],
    canary: [
      {
        title: "MFA edge case surfaces",
        detail: "Enterprise SAML + new session TTL breaks for one IdP.",
        layer: "security",
        boost: { safety: 0.18, control: 0.12 },
      },
    ],
    cutover: [
      {
        title: "Primary session revoke",
        detail: "Mass logout event. Users mid-checkout lose auth mid-flow.",
        layer: "traffic",
        boost: { continuity: 0.28, safety: 0.2 },
      },
    ],
    stress: [
      {
        title: "Orphan session storm",
        detail: "Revoked tokens still grant access for 4 minutes — attacker window.",
        layer: "security",
        boost: { safety: 0.3, control: 0.15 },
      },
    ],
    recovery: [
      {
        title: "Session read-repair",
        detail: "Kill-switch held. Gradual trust rebuild for affected cohort.",
        layer: "infra",
        boost: { continuity: -0.1, safety: -0.08 },
      },
    ],
  },
  database: {
    prepare: [
      {
        title: "Expand migration applied",
        detail: "New columns live. Backfill job queued with checkpoint.",
        layer: "legacy",
        boost: { continuity: 0.1 },
      },
    ],
    canary: [
      {
        title: "Backfill lag visible",
        detail: "10% of rows still on old shape. Read path serves stale joins.",
        layer: "infra",
        boost: { continuity: 0.16, safety: 0.1 },
      },
    ],
    cutover: [
      {
        title: "Lock timeout on hot table",
        detail: "SRE error budget burns. PM still wants Friday narrative.",
        layer: "sre",
        boost: { safety: 0.22, continuity: 0.18 },
      },
    ],
    stress: [
      {
        title: "Half-failed migration detected",
        detail: "Some shards on new schema, some on old — support tickets spike.",
        layer: "support",
        boost: { continuity: 0.24, fairness: 0.12 },
      },
    ],
    recovery: [
      {
        title: "Contract migration completes",
        detail: "Expand/contract final step. Legacy bug contracts preserved behind flag.",
        layer: "legacy",
        boost: { continuity: -0.12 },
      },
    ],
  },
  framework: {
    prepare: [{ title: "Compat layer deployed", detail: "Deprecated APIs shimmed.", layer: "product", boost: { continuity: 0.08 } }],
    canary: [{ title: "Render path canary", detail: "5% traffic on new runtime.", layer: "traffic", boost: { continuity: 0.12 } }],
    cutover: [{ title: "Major route flip", detail: "Error budget wobble.", layer: "sre", boost: { safety: 0.18 } }],
    stress: [{ title: "Hydration mismatch reports", detail: "Support + PM collision.", layer: "product", boost: { fairness: 0.14 } }],
    recovery: [{ title: "Rollback path tested", detail: "Kill-switch verified.", layer: "infra", boost: { safety: -0.1 } }],
  },
  api_version: {
    prepare: [{ title: "Shadow traffic to v2", detail: "Dual delivery for webhooks.", layer: "traffic", boost: { continuity: 0.1 } }],
    canary: [{ title: "SDK client breaks on field rename", detail: "Enterprise integrator opens ticket.", layer: "support", boost: { fairness: 0.14 } }],
    cutover: [{ title: "v1 write path deprecated", detail: "Downstream consumers race.", layer: "traffic", boost: { continuity: 0.2 } }],
    stress: [{ title: "Webhook consumer backlog", detail: "Partner SLA breach.", layer: "finance", boost: { money: 0.15 } }],
    recovery: [{ title: "Deprecation window extended", detail: "Trust stabilizes.", layer: "product", boost: { fairness: -0.06 } }],
  },
};

export function scenarioBeat(
  phase: SimulationPhase,
  kind: MigrationKind,
  fp: RepoFingerprint | null | undefined,
  rng: () => number,
  seen: Set<string>,
): ScenarioBeat | null {
  const pool = BEATS[kind][phase] ?? [];
  const available = pool.filter((b) => !seen.has(`${phase}:${b.title}`));
  if (!available.length) return null;

  let beat = pick(rng, available);
  seen.add(`${phase}:${beat.title}`);

  // Fingerprint sharpens beats
  if (fp?.hasStripe && phase === "stress" && kind === "billing") {
    beat = {
      ...beat,
      title: "Stripe API 503 burst",
      detail: "Checkout path retries amplify duplicate invoice risk on the canary cohort.",
      boost: { ...beat.boost, money: (beat.boost.money ?? 0) + 0.1, continuity: (beat.boost.continuity ?? 0) + 0.08 },
    };
  }
  if (fp?.hasWebhooks && (phase === "cutover" || phase === "stress")) {
    beat = {
      ...beat,
      detail: `${beat.detail} Webhook consumers report duplicate delivery.`,
      boost: { ...beat.boost, continuity: (beat.boost.continuity ?? 0) + 0.1 },
    };
  }
  if (fp?.hasPrisma && kind === "database" && phase === "cutover") {
    beat = {
      ...beat,
      title: "Prisma migration lock contention",
      detail: "Long-running transaction blocks backfill checkpoint.",
      boost: { ...beat.boost, safety: (beat.boost.safety ?? 0) + 0.12 },
    };
  }

  return { phase, ...beat };
}

export function phaseLabel(phase: SimulationPhase): string {
  const labels: Record<SimulationPhase, string> = {
    prepare: "Prepare",
    canary: "Canary",
    cutover: "Cutover",
    stress: "Stress",
    recovery: "Recovery",
  };
  return labels[phase];
}
