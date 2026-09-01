import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATA_DIR =
  process.env.FORKTOWN_DATA_DIR ??
  (process.env.VERCEL
    ? path.join("/tmp", "forktown-data")
    : path.join(process.cwd(), ".data"));
const DB_PATH = process.env.FORKTOWN_DB_PATH ?? path.join(DATA_DIR, "forktown.sqlite");

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS towns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      codebase TEXT NOT NULL,
      seed INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL,
      repo_url TEXT,
      repo_owner TEXT,
      repo_name TEXT,
      default_branch TEXT,
      fingerprint TEXT,
      source TEXT NOT NULL DEFAULT 'manual'
    );
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      town_id TEXT NOT NULL REFERENCES towns(id),
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      hypothesis TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      intensity INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      town_id TEXT NOT NULL REFERENCES towns(id),
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      town_id TEXT NOT NULL REFERENCES towns(id),
      run_id TEXT REFERENCES runs(id),
      api_key_id TEXT REFERENCES api_keys(id),
      agent_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_towns_slug ON towns(slug);
    CREATE INDEX IF NOT EXISTS idx_runs_town ON runs(town_id);
    CREATE INDEX IF NOT EXISTS idx_plans_town ON plans(town_id);
  `);
}

export function getDb() {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  migrate(sqlite);
  _db = drizzle(sqlite, { schema });
  return _db;
}

export { schema };
