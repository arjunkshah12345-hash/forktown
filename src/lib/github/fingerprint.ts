import type { MigrationKind } from "../sim/types";

export interface RepoFingerprint {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  language: string | null;
  topics: string[];
  hasStripe: boolean;
  hasBilling: boolean;
  hasAuth: boolean;
  hasMigrations: boolean;
  hasPrisma: boolean;
  hasDrizzle: boolean;
  hasNextAuth: boolean;
  hasClerk: boolean;
  hasWebhooks: boolean;
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  frameworks: string[];
  dependencyHits: string[];
  pathHits: string[];
  suggestedMigrations: MigrationKind[];
  customerEstimate: number;
  analyzedAt: string;
  filesSampled: number;
  source?: "github" | "local";
  localPath?: string;
}

export interface FingerprintInput {
  paths: string[];
  depNames: string[];
  meta: {
    owner: string;
    name: string;
    fullName: string;
    description?: string | null;
    defaultBranch?: string;
    stars?: number;
    language?: string | null;
    topics?: string[];
    source?: "github" | "local";
    localPath?: string;
  };
}

const BILLING_DEPS = [/stripe/i, /paddle/i, /chargebee/i, /recurly/i, /billing/i, /lemon.?squeezy/i];
const AUTH_DEPS = [/next-auth/i, /@clerk/i, /auth0/i, /supabase\/auth/i, /lucia/i, /passport/i, /firebase\/auth/i];
const DB_DEPS = [/prisma/i, /drizzle/i, /typeorm/i, /sequelize/i, /knex/i, /mongoose/i, /@neondatabase/i];

export function buildFingerprint(input: FingerprintInput): RepoFingerprint {
  const { paths, depNames, meta } = input;
  const filesSampled = paths.length;

  const dependencyHits = depNames.filter((d) =>
    [...BILLING_DEPS, ...AUTH_DEPS, ...DB_DEPS, /webhook/i, /express/i, /^next$/i, /fastify/i].some((r) =>
      r.test(d),
    ),
  );

  const pathHits = paths.filter((p) =>
    /stripe|billing|invoice|checkout|auth|migration|prisma|drizzle|webhook|schema\.sql|supabase/i.test(p),
  );

  const hasStripe = dependencyHits.some((d) => /stripe/i.test(d)) || pathHits.some((p) => /stripe/i.test(p));
  const hasBilling =
    hasStripe ||
    dependencyHits.some((d) => BILLING_DEPS.some((r) => r.test(d))) ||
    pathHits.some((p) => /billing|invoice|checkout/i.test(p));
  const hasAuth =
    dependencyHits.some((d) => AUTH_DEPS.some((r) => r.test(d))) || pathHits.some((p) => /auth/i.test(p));
  const hasPrisma = dependencyHits.some((d) => /prisma/i.test(d)) || paths.some((p) => /prisma\//i.test(p));
  const hasDrizzle = dependencyHits.some((d) => /drizzle/i.test(d)) || paths.some((p) => /drizzle/i.test(p));
  const hasMigrations =
    hasPrisma ||
    hasDrizzle ||
    paths.some((p) => /migrations?\//i.test(p) || /supabase\/migrations/i.test(p));
  const hasNextAuth = dependencyHits.some((d) => /next-auth|@auth\//i.test(d));
  const hasClerk = dependencyHits.some((d) => /@clerk/i.test(d));
  const hasWebhooks =
    pathHits.some((p) => /webhook/i.test(p)) || dependencyHits.some((d) => /svix|webhook/i.test(d));

  const frameworks: string[] = [];
  if (dependencyHits.some((d) => d === "next") || paths.some((p) => /^next\.config\./i.test(p)))
    frameworks.push("next");
  if (dependencyHits.some((d) => d === "react")) frameworks.push("react");
  if (dependencyHits.some((d) => /express/i.test(d))) frameworks.push("express");
  if (dependencyHits.some((d) => /fastapi|django|flask/i.test(d))) frameworks.push("python-web");
  if (meta.language) frameworks.push(meta.language.toLowerCase());

  let packageManager: RepoFingerprint["packageManager"] = "unknown";
  if (paths.includes("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (paths.includes("yarn.lock")) packageManager = "yarn";
  else if (paths.includes("bun.lockb") || paths.includes("bun.lock")) packageManager = "bun";
  else if (paths.includes("package-lock.json")) packageManager = "npm";

  const suggestedMigrations: MigrationKind[] = [];
  if (hasBilling) suggestedMigrations.push("billing");
  if (hasAuth) suggestedMigrations.push("auth");
  if (hasMigrations) suggestedMigrations.push("database");
  if (frameworks.includes("next")) suggestedMigrations.push("framework");
  if (paths.some((p) => /\/v1\/|\/v2\/|openapi|swagger/i.test(p))) suggestedMigrations.push("api_version");
  if (!suggestedMigrations.length) suggestedMigrations.push("database");

  const stars = meta.stars ?? 0;
  const customerEstimate = Math.min(
    120_000,
    Math.max(3_000, Math.round(800 + stars * 12 + filesSampled * 2 + (hasBilling ? 15_000 : 0))),
  );

  return {
    owner: meta.owner,
    name: meta.name,
    fullName: meta.fullName,
    description: meta.description ?? null,
    defaultBranch: meta.defaultBranch ?? "main",
    stars,
    language: meta.language ?? null,
    topics: meta.topics ?? [],
    hasStripe,
    hasBilling,
    hasAuth,
    hasMigrations,
    hasPrisma,
    hasDrizzle,
    hasNextAuth,
    hasClerk,
    hasWebhooks,
    packageManager,
    frameworks: [...new Set(frameworks)],
    dependencyHits: dependencyHits.slice(0, 40),
    pathHits: pathHits.slice(0, 60),
    suggestedMigrations: [...new Set(suggestedMigrations)],
    customerEstimate,
    analyzedAt: new Date().toISOString(),
    filesSampled,
    source: meta.source,
    localPath: meta.localPath,
  };
}

export function depsFromPackageJson(pkg: Record<string, unknown> | null): string[] {
  if (!pkg) return [];
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  return Object.keys(deps ?? {});
}
