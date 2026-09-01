import type { MigrationKind } from "../sim/types";
import type { RepoFingerprint } from "./fingerprint";

export interface MigrationPlaybook {
  kind: MigrationKind;
  title: string;
  hypothesis: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  rationale: string;
}

const PLAYBOOKS: Record<MigrationKind, (fp: RepoFingerprint) => Omit<MigrationPlaybook, "kind">> = {
  billing: (fp) => ({
    title: fp.hasStripe
      ? "Stripe Checkout → custom invoices"
      : "Billing adapter cutover",
    hypothesis: fp.hasWebhooks
      ? "Dual-write invoices + idempotent webhooks + legacy coupon flags survive finance close and angry buyers."
      : "Dual-write + cohort flags keep revenue and legacy billing quirks intact during cutover.",
    intensity: fp.hasStripe && fp.hasWebhooks ? 4 : 3,
    rationale: fp.hasStripe
      ? "Stripe surface detected — high loss-aversion pressure on money paths."
      : "Billing paths in tree — moderate subjective pressure expected.",
  }),
  auth: (fp) => ({
    title: fp.hasClerk
      ? "Clerk → self-hosted sessions"
      : fp.hasNextAuth
        ? "NextAuth session store migration"
        : "Auth provider cutover",
    hypothesis:
      "Shadow tokens + phased cohort rollout preserve sessions; kill-switch on auth errors before trust collapses.",
    intensity: fp.hasAuth ? 4 : 3,
    rationale: "Auth dependencies/paths found — session continuity is the reference point buyers defend.",
  }),
  database: (fp) => ({
    title: fp.hasPrisma
      ? "Prisma schema migration + online backfill"
      : fp.hasDrizzle
        ? "Drizzle expand/contract migration"
        : "Online schema migration",
    hypothesis:
      "Expand/contract with checkpointed backfill and read-repair; no lock held long enough to page SRE.",
    intensity: fp.hasMigrations ? 4 : 3,
    rationale: fp.hasMigrations
      ? "Migration folders detected — legacy data contracts likely."
      : "Default database rehearsal — town still stress-tests continuity.",
  }),
  framework: (fp) => ({
    title: fp.frameworks.includes("next")
      ? "Next.js major upgrade"
      : "Framework/runtime upgrade",
    hypothesis:
      "Compat layer + feature-flagged routes; canary on error budget with rollback before PM narrative breaks.",
    intensity: 3,
    rationale: "Framework upgrade — product and SRE minds weigh schedule vs safety.",
  }),
  api_version: (fp) => ({
    title: "Public API v1 → v2 with shadow traffic",
    hypothesis:
      "Shadow compare on write paths + deprecation window; webhook consumers get dual delivery until trust recovers.",
    intensity: fp.hasWebhooks ? 4 : 3,
    rationale: "API/version paths or webhooks — downstream clients amplify subjective anger.",
  }),
};

export function playbookForKind(fp: RepoFingerprint, kind: MigrationKind): MigrationPlaybook {
  const base = PLAYBOOKS[kind](fp);
  return { kind, ...base };
}

export function primaryPlaybook(fp: RepoFingerprint | null | undefined): MigrationPlaybook {
  const kind = fp?.suggestedMigrations[0] ?? "database";
  if (!fp) {
    return {
      kind,
      title: "Migration rehearsal",
      hypothesis: "Dual-write + flags should survive subjective town pressure.",
      intensity: 3,
      rationale: "No fingerprint — generic rehearsal.",
    };
  }
  return playbookForKind(fp, kind);
}

export function allPlaybooks(fp: RepoFingerprint): MigrationPlaybook[] {
  return fp.suggestedMigrations.map((kind) => playbookForKind(fp, kind));
}
