/**
 * Mitigation physics — makes agent moves causally matter.
 * Without this, neural plans are cosmetics. With it, ablating dual-write
 * or kill-switch measurably collapses survivability.
 */

import type { MigrationKind } from "../types";

export interface Disruption {
  continuity: number;
  money: number;
  fairness: number;
  safety: number;
  control: number;
}

export interface MitigationProfile {
  hasDualWrite: boolean;
  hasIdempotency: boolean;
  hasKillSwitch: boolean;
  hasFlags: boolean;
  hasLegacyPreserve: boolean;
  hasShadow: boolean;
  hasBackfill: boolean;
  blob: string;
}

export function profileMitigations(mitigations: string[]): MitigationProfile {
  const blob = mitigations.join(" ").toLowerCase();
  return {
    hasDualWrite: /dual-write|dual write/.test(blob),
    hasIdempotency: /idempotency/.test(blob),
    hasKillSwitch: /kill-switch|rollback/.test(blob),
    hasFlags: /feature-flag|cohort|canary/.test(blob),
    hasLegacyPreserve: /legacy|preserve|cookie|compat/.test(blob),
    hasShadow: /shadow/.test(blob),
    hasBackfill: /backfill|checkpoint/.test(blob),
    blob,
  };
}

/** Shrink (or amplify) disruption based on live mitigations — core causality. */
export function applyMitigationShield(
  disruption: Disruption,
  mitigations: string[],
  kind: MigrationKind,
): Disruption {
  const p = profileMitigations(mitigations);
  const d = { ...disruption };

  if (p.hasDualWrite) {
    d.continuity *= 0.62;
    d.money *= 0.75;
    d.fairness *= 0.85;
  } else if (kind === "billing" || kind === "database") {
    d.continuity = Math.min(1, d.continuity + 0.22);
    d.money = Math.min(1, d.money + 0.18);
  }

  if (p.hasIdempotency) {
    d.safety *= 0.55;
    d.money *= 0.82;
  } else if (kind === "billing" || kind === "api_version") {
    d.safety = Math.min(1, d.safety + 0.18);
    d.money = Math.min(1, d.money + 0.08);
  }

  if (p.hasKillSwitch) {
    d.safety *= 0.62;
    d.control = Math.max(0, d.control - 0.1);
  } else {
    d.safety = Math.min(1, d.safety + 0.14);
    d.continuity = Math.min(1, d.continuity + 0.06);
  }

  if (p.hasFlags) {
    d.control = Math.max(0, d.control - 0.14);
    d.continuity *= 0.9;
  } else {
    d.control = Math.min(1, d.control + 0.1);
  }

  if (p.hasLegacyPreserve) {
    d.continuity *= 0.75;
    d.money *= 0.92;
  }

  if (p.hasShadow) {
    d.continuity *= 0.88;
    d.fairness *= 0.9;
  }

  if (p.hasBackfill && kind === "database") {
    d.continuity *= 0.8;
  }

  return {
    continuity: clamp01(d.continuity),
    money: clamp01(d.money),
    fairness: clamp01(d.fairness),
    safety: clamp01(d.safety),
    control: clamp01(d.control),
  };
}

/** Soft outage ceiling when kill-switch is armed */
export function outageCap(mitigations: string[], intensity: number): number {
  const p = profileMitigations(mitigations);
  if (p.hasKillSwitch) return 11 + intensity * 0.8;
  return 48;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** Coverage score 0–1 for hypothesis / fidelity */
export function mitigationCoverage(kind: MigrationKind, mitigations: string[]): number {
  const p = profileMitigations(mitigations);
  const checks: boolean[] =
    kind === "billing"
      ? [p.hasDualWrite, p.hasIdempotency, p.hasKillSwitch, p.hasFlags]
      : kind === "auth"
        ? [p.hasShadow || p.hasFlags, p.hasKillSwitch, p.hasLegacyPreserve, p.hasIdempotency]
        : kind === "database"
          ? [p.hasDualWrite, p.hasBackfill, p.hasKillSwitch, p.hasFlags]
          : [p.hasFlags, p.hasKillSwitch, p.hasShadow || p.hasDualWrite, p.hasIdempotency];
  return checks.filter(Boolean).length / checks.length;
}
