/**
 * Mitigation physics — makes agent moves causally matter.
 * Ablating dual-write / idempotency / kill-switch must measurably hurt.
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
    d.continuity *= 0.58;
    d.money *= 0.7;
    d.fairness *= 0.82;
  } else if (kind === "billing" || kind === "database") {
    d.continuity = Math.min(1, d.continuity + 0.26);
    d.money = Math.min(1, d.money + 0.22);
    d.fairness = Math.min(1, d.fairness + 0.1);
  }

  if (p.hasIdempotency) {
    d.safety *= 0.48;
    d.money *= 0.78;
    d.continuity *= 0.92;
  } else if (kind === "billing" || kind === "api_version" || kind === "auth") {
    d.safety = Math.min(1, d.safety + 0.24);
    d.money = Math.min(1, d.money + 0.12);
    d.control = Math.min(1, d.control + 0.08);
  }

  if (p.hasKillSwitch) {
    d.safety *= 0.55;
    d.control = Math.max(0, d.control - 0.12);
    d.continuity *= 0.94;
  } else {
    d.safety = Math.min(1, d.safety + 0.18);
    d.continuity = Math.min(1, d.continuity + 0.1);
    d.money = Math.min(1, d.money + 0.06);
  }

  if (p.hasFlags) {
    d.control = Math.max(0, d.control - 0.16);
    d.continuity *= 0.88;
  } else {
    d.control = Math.min(1, d.control + 0.12);
  }

  if (p.hasLegacyPreserve) {
    d.continuity *= 0.72;
    d.money *= 0.9;
  }

  if (p.hasShadow) {
    d.continuity *= 0.86;
    d.fairness *= 0.88;
  }

  if (p.hasBackfill && kind === "database") {
    d.continuity *= 0.78;
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
  if (p.hasKillSwitch) return 9 + intensity * 0.7;
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

/**
 * Explicit score penalty for missing core mitigations.
 * Guarantees ablation deltas stay non-positive even when path noise is high.
 */
export function missingMitigationPenalty(kind: MigrationKind, mitigations: string[]): number {
  const p = profileMitigations(mitigations);
  let pen = 0;
  if (kind === "billing" || kind === "database") {
    if (!p.hasDualWrite) pen += 0.07;
  }
  if (kind === "billing" || kind === "api_version" || kind === "auth") {
    if (!p.hasIdempotency) pen += 0.06;
  }
  if (!p.hasKillSwitch) pen += 0.055;
  if (!p.hasFlags) pen += 0.03;
  if (kind === "database" && !p.hasBackfill) pen += 0.04;
  return pen;
}

/** Per-tick trust heal in recovery when mitigations are load-bearing */
export function recoveryHealStrength(mitigations: string[]): number {
  const p = profileMitigations(mitigations);
  let h = 0;
  if (p.hasDualWrite) h += 0.018;
  if (p.hasFlags) h += 0.012;
  if (p.hasKillSwitch) h += 0.01;
  if (p.hasIdempotency) h += 0.01;
  if (p.hasShadow || p.hasLegacyPreserve) h += 0.006;
  return h;
}
