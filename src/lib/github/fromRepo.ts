import { generateTown } from "../sim/world";
import { createPrng } from "../sim/prng";
import type { Town } from "../sim/types";
import type { RepoFingerprint } from "./fingerprint";

/** Build a living town whose shape follows the real repository fingerprint. */
export function townFromFingerprint(
  fingerprint: RepoFingerprint,
  opts?: { name?: string },
): Town {
  const name =
    opts?.name ??
    `${fingerprint.name
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")} Town`;

  const codebase =
    fingerprint.source === "local" && fingerprint.localPath
      ? fingerprint.localPath
      : `github.com/${fingerprint.fullName}`;

  const seedKey =
    fingerprint.source === "local"
      ? `local:${fingerprint.localPath}:${fingerprint.analyzedAt.slice(0, 10)}`
      : `github:${fingerprint.fullName}:${fingerprint.defaultBranch}:${fingerprint.analyzedAt.slice(0, 10)}`;

  const town = generateTown({
    name,
    codebase,
    customerCount: fingerprint.customerEstimate,
    seed: seedKey,
  });

  const tags = new Set(town.tags);
  tags.add("real-repo");
  tags.add(fingerprint.source === "local" ? "local-ingested" : "github-ingested");
  if (fingerprint.hasBilling) tags.add("billing-surface");
  if (fingerprint.hasStripe) tags.add("stripe");
  if (fingerprint.hasAuth) tags.add("auth-surface");
  if (fingerprint.hasMigrations) tags.add("migrations");
  if (fingerprint.hasWebhooks) tags.add("webhooks");
  for (const m of fingerprint.suggestedMigrations) tags.add(`suggest:${m}`);

  for (const d of town.districts) {
    if (d.kind === "billing" && fingerprint.hasBilling) {
      d.load = Math.min(0.95, d.load + 0.25);
      d.health = Math.max(0.55, d.health - 0.08);
    }
    if (d.kind === "auth" && fingerprint.hasAuth) {
      d.load = Math.min(0.95, d.load + 0.2);
    }
    if (d.kind === "data" && fingerprint.hasMigrations) {
      d.load = Math.min(0.95, d.load + 0.22);
    }
    if (d.kind === "api" && fingerprint.hasWebhooks) {
      d.load = Math.min(0.95, d.load + 0.18);
    }
    if (d.kind === "security" && fingerprint.hasStripe) {
      d.load = Math.min(0.95, d.load + 0.15);
    }
  }

  // Fingerprint-shaped legacy bug contracts
  const bugPool = [
    ...(fingerprint.hasStripe ? ["webhook idempotency key ignored", "coupon ghost on Stripe retry"] : []),
    ...(fingerprint.hasWebhooks ? ["duplicate webhook delivery tolerated", "out-of-order invoice events"] : []),
    ...(fingerprint.hasAuth ? ["session TTL mismatch on mobile", "legacy cookie path still valid"] : []),
    ...(fingerprint.hasPrisma ? ["partial migration row shape", "timezone off-by-one on invoices"] : []),
    "legacy plan ID still accepted",
    "refunds create ghost credits",
  ];
  if (bugPool.length) {
    const rng = createPrng(town.seed ^ 0x425547);
    town.users = town.users.map((u, i) => {
      if (i > 120 || u.dependsOnBug) return u;
      const legacyBias = u.segment === "legacy" ? 0.35 : fingerprint.hasBilling ? 0.12 : 0.06;
      if (rng() > legacyBias) return u;
      return {
        ...u,
        dependsOnBug: bugPool[i % bugPool.length],
        anger: Math.min(1, u.anger + 0.12),
      };
    });
    town.world.legacyContracts = town.users.filter((u) => u.dependsOnBug).length;
  }

  return { ...town, tags: [...tags] };
}

/** Re-apply fingerprint biases onto an existing town (resync). */
export function applyFingerprintToTown(town: Town, fingerprint: RepoFingerprint): Town {
  const next = townFromFingerprint(fingerprint, { name: town.name });
  return {
    ...next,
    id: town.id,
    slug: town.slug,
    createdAt: town.createdAt,
  };
}
