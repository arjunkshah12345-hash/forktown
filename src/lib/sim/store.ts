import { desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "../db";
import { ensureBootstrapKey } from "../db/keys";
import { simulateRehearsal } from "./engine";
import { generateAcmeBillingTown, generateTown } from "./world";
import type {
  CreateTownInput,
  MigrationKind,
  RehearsalPlan,
  RehearsalRun,
  Town,
} from "./types";
import type { RepoFingerprint } from "../github/fingerprint";
import { applyFingerprintToTown } from "../github/fromRepo";
import { ingestGithubRepo } from "../github/ingest";
import { ingestLocalRepo } from "../github/scanLocal";
import type { TownWithMeta } from "../types/town";

export const STARTER_TOWN_SLUG = "acme-billing-town";

function parseTown(row: typeof schema.towns.$inferSelect): TownWithMeta {
  const town = JSON.parse(row.payload) as Town;
  return {
    ...town,
    repoUrl: row.repoUrl,
    fingerprint: row.fingerprint ? (JSON.parse(row.fingerprint) as RepoFingerprint) : null,
    source: row.source,
  };
}

/** Always-available real sim town (not a fake UI demo). */
export async function ensureStarterTown(): Promise<TownWithMeta> {
  await ensureBootstrapKey();
  const existing = await getTown(STARTER_TOWN_SLUG);
  if (existing) return existing;

  const town = generateAcmeBillingTown();
  town.id = STARTER_TOWN_SLUG;
  town.slug = STARTER_TOWN_SLUG;
  town.name = "Acme Billing Town";
  town.codebase = "github.com/acme/billing-platform";
  persistTown(town, {
    source: "starter",
    repoUrl: "https://github.com/acme/billing-platform",
  });
  return (await getTown(STARTER_TOWN_SLUG))!;
}

export async function listTowns(): Promise<Town[]> {
  await ensureStarterTown();
  const db = getDb();
  const rows = db.select().from(schema.towns).orderBy(desc(schema.towns.createdAt)).all();
  return rows.map(parseTown);
}

export async function getTown(id: string): Promise<ReturnType<typeof parseTown> | undefined> {
  await ensureBootstrapKey();
  const db = getDb();
  const row = db
    .select()
    .from(schema.towns)
    .where(or(eq(schema.towns.id, id), eq(schema.towns.slug, id)))
    .get();
  return row ? parseTown(row) : undefined;
}

export async function createTown(input: CreateTownInput): Promise<Town> {
  await ensureBootstrapKey();
  const town = generateTown(input);
  persistTown(town, { source: "manual" });
  return town;
}

export function persistTown(
  town: Town,
  meta?: {
    source?: string;
    repoUrl?: string;
    fingerprint?: RepoFingerprint;
  },
) {
  const db = getDb();
  const fp = meta?.fingerprint;
  db.insert(schema.towns)
    .values({
      id: town.id,
      name: town.name,
      slug: town.slug,
      codebase: town.codebase,
      seed: town.seed,
      createdAt: town.createdAt,
      payload: JSON.stringify(town),
      repoUrl: meta?.repoUrl ?? (fp?.source === "local" ? null : fp ? `https://github.com/${fp.fullName}` : null),
      repoOwner: fp?.owner ?? null,
      repoName: fp?.name ?? null,
      defaultBranch: fp?.defaultBranch ?? null,
      fingerprint: fp ? JSON.stringify(fp) : null,
      source: meta?.source ?? "manual",
    })
    .run();
}

export async function createTownFromGithub(input: {
  town: Town;
  fingerprint: RepoFingerprint;
  repoUrl: string;
}): Promise<Town> {
  await ensureBootstrapKey();
  const db = getDb();
  let slug = input.town.slug;
  const clash = db.select().from(schema.towns).where(eq(schema.towns.slug, slug)).get();
  if (clash) {
    slug = `${slug}-${nanoid(4)}`;
    input.town.slug = slug;
  }
  persistTown(input.town, {
    source: "github",
    repoUrl: input.repoUrl,
    fingerprint: input.fingerprint,
  });
  return input.town;
}

export async function createTownFromLocal(input: {
  town: Town;
  fingerprint: RepoFingerprint;
}): Promise<Town> {
  await ensureBootstrapKey();
  const db = getDb();
  let slug = input.town.slug;
  const clash = db.select().from(schema.towns).where(eq(schema.towns.slug, slug)).get();
  if (clash) {
    slug = `${slug}-${nanoid(4)}`;
    input.town.slug = slug;
  }
  persistTown(input.town, {
    source: "local",
    fingerprint: input.fingerprint,
  });
  return input.town;
}

export async function resyncTown(townId: string): Promise<TownWithMeta> {
  const existing = await getTown(townId);
  if (!existing) throw new Error("Town not found");

  let fingerprint: RepoFingerprint;
  if (existing.fingerprint?.source === "local" && existing.fingerprint.localPath) {
    ({ fingerprint } = ingestLocalRepo(existing.fingerprint.localPath));
  } else if (existing.repoUrl) {
    ({ fingerprint } = await ingestGithubRepo(existing.repoUrl));
  } else {
    throw new Error("Town has no GitHub URL or local path to resync");
  }

  const updated = applyFingerprintToTown(existing, fingerprint);
  const db = getDb();
  db.update(schema.towns)
    .set({
      payload: JSON.stringify(updated),
      fingerprint: JSON.stringify(fingerprint),
      codebase: updated.codebase,
      seed: updated.seed,
    })
    .where(eq(schema.towns.id, existing.id))
    .run();

  return (await getTown(existing.id))!;
}

export async function createPlan(input: {
  townId: string;
  kind: MigrationKind;
  title: string;
  hypothesis: string;
  agentName: string;
  intensity: 1 | 2 | 3 | 4 | 5;
}): Promise<RehearsalPlan> {
  const plan: RehearsalPlan = {
    id: nanoid(10),
    townId: input.townId,
    kind: input.kind,
    title: input.title,
    hypothesis: input.hypothesis,
    agentName: input.agentName,
    intensity: input.intensity,
    createdAt: new Date().toISOString(),
  };
  const db = getDb();
  db.insert(schema.plans)
    .values({
      id: plan.id,
      townId: plan.townId,
      kind: plan.kind,
      title: plan.title,
      hypothesis: plan.hypothesis,
      agentName: plan.agentName,
      intensity: plan.intensity,
      createdAt: plan.createdAt,
      payload: JSON.stringify(plan),
    })
    .run();
  return plan;
}

export async function getPlan(id: string): Promise<RehearsalPlan | undefined> {
  const db = getDb();
  const row = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  return row ? (JSON.parse(row.payload) as RehearsalPlan) : undefined;
}

export async function listPlans(townId: string): Promise<RehearsalPlan[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.townId, townId))
    .orderBy(desc(schema.plans.createdAt))
    .all()
    .map((r) => JSON.parse(r.payload) as RehearsalPlan);
}

export async function runRehearsal(planId: string): Promise<RehearsalRun> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error("Plan not found");
  const town = await getTown(plan.townId);
  if (!town) throw new Error("Town not found");
  const run = simulateRehearsal(town, plan, { fingerprint: town.fingerprint ?? null });
  const db = getDb();
  db.insert(schema.runs)
    .values({
      id: run.id,
      planId: run.planId,
      townId: run.townId,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt ?? null,
      payload: JSON.stringify(run),
    })
    .run();
  return run;
}

export async function getRun(id: string): Promise<RehearsalRun | undefined> {
  const db = getDb();
  const row = db.select().from(schema.runs).where(eq(schema.runs.id, id)).get();
  return row ? (JSON.parse(row.payload) as RehearsalRun) : undefined;
}

export async function listRuns(townId: string): Promise<RehearsalRun[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.runs)
    .where(eq(schema.runs.townId, townId))
    .orderBy(desc(schema.runs.startedAt))
    .all()
    .map((r) => JSON.parse(r.payload) as RehearsalRun);
}

export interface RecentRunRow {
  run: RehearsalRun;
  townName: string;
  townSlug: string;
}

export async function listRecentRuns(limit = 20): Promise<RecentRunRow[]> {
  const db = getDb();
  const rows = db
    .select({
      runPayload: schema.runs.payload,
      townName: schema.towns.name,
      townSlug: schema.towns.slug,
      townId: schema.towns.id,
    })
    .from(schema.runs)
    .innerJoin(schema.towns, eq(schema.runs.townId, schema.towns.id))
    .orderBy(desc(schema.runs.startedAt))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    run: JSON.parse(r.runPayload) as RehearsalRun,
    townName: r.townName,
    townSlug: r.townSlug,
  }));
}
