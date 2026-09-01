import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const towns = sqliteTable("towns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  codebase: text("codebase").notNull(),
  seed: integer("seed").notNull(),
  createdAt: text("created_at").notNull(),
  payload: text("payload").notNull(), // full Town JSON
  repoUrl: text("repo_url"),
  repoOwner: text("repo_owner"),
  repoName: text("repo_name"),
  defaultBranch: text("default_branch"),
  fingerprint: text("fingerprint"), // RepoFingerprint JSON
  source: text("source").notNull().default("manual"), // github | manual | sample
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  townId: text("town_id")
    .notNull()
    .references(() => towns.id),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  hypothesis: text("hypothesis").notNull(),
  agentName: text("agent_name").notNull(),
  intensity: integer("intensity").notNull(),
  createdAt: text("created_at").notNull(),
  payload: text("payload").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  townId: text("town_id")
    .notNull()
    .references(() => towns.id),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  payload: text("payload").notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
});

export const agentSessions = sqliteTable("agent_sessions", {
  id: text("id").primaryKey(),
  townId: text("town_id")
    .notNull()
    .references(() => towns.id),
  runId: text("run_id").references(() => runs.id),
  apiKeyId: text("api_key_id").references(() => apiKeys.id),
  agentName: text("agent_name").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  payload: text("payload"),
});
