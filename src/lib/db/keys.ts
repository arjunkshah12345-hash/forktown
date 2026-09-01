import { createHash, randomBytes } from "crypto";
import { eq, isNull, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "./index";

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function mintApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `ft_live_${randomBytes(24).toString("base64url")}`;
  return { raw, prefix: raw.slice(0, 12), hash: hashApiKey(raw) };
}

export async function createApiKey(name: string) {
  const db = getDb();
  const minted = mintApiKey();
  const id = nanoid(12);
  const createdAt = new Date().toISOString();
  db.insert(schema.apiKeys)
    .values({
      id,
      name,
      keyHash: minted.hash,
      keyPrefix: minted.prefix,
      createdAt,
    })
    .run();
  return { id, name, key: minted.raw, prefix: minted.prefix, createdAt };
}

export async function listApiKeys() {
  const db = getDb();
  return db
    .select({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      prefix: schema.apiKeys.keyPrefix,
      createdAt: schema.apiKeys.createdAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      revokedAt: schema.apiKeys.revokedAt,
    })
    .from(schema.apiKeys)
    .orderBy(desc(schema.apiKeys.createdAt))
    .all();
}

export async function revokeApiKey(id: string) {
  const db = getDb();
  db.update(schema.apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(schema.apiKeys.id, id))
    .run();
}

export async function authenticateApiKey(raw: string | null | undefined) {
  if (!raw) return null;
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("ft_live_")) return null;
  const db = getDb();
  const hash = hashApiKey(token);
  const row = db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, hash))
    .get();
  if (!row || row.revokedAt) return null;
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(schema.apiKeys.id, row.id))
    .run();
  return row;
}

export async function ensureBootstrapKey(): Promise<string | null> {
  const db = getDb();
  const existing = db
    .select()
    .from(schema.apiKeys)
    .where(isNull(schema.apiKeys.revokedAt))
    .get();
  if (existing) return null;
  const created = await createApiKey("default-agent");
  // Persist once for CLI bootstrap (local .data or /tmp on Vercel)
  const fs = await import("fs");
  const path = await import("path");
  const dataDir =
    process.env.FORKTOWN_DATA_DIR ??
    (process.env.VERCEL ? path.join("/tmp", "forktown-data") : path.join(process.cwd(), ".data"));
  fs.mkdirSync(dataDir, { recursive: true });
  const p = path.join(dataDir, "bootstrap-api-key.txt");
  try {
    fs.writeFileSync(p, `${created.key}\n`, "utf8");
  } catch {
    /* ephemeral FS may be read-only outside /tmp — key still returned via createApiKey callers */
  }
  return created.key;
}
