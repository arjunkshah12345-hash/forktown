"use client";

import type { SampleDistrict } from "./sample-data";

const DEPS: Record<string, string[]> = {
  billing: ["auth", "api", "finance"],
  auth: ["api", "data"],
  api: ["data", "edge"],
  data: ["security"],
  support: ["billing", "auth"],
  finance: ["billing", "data"],
  security: ["api", "edge"],
  edge: ["api"],
};

export function PixelDistrictPanel({
  district,
  onClose,
  onFocusAgent,
}: {
  district: SampleDistrict;
  onClose: () => void;
  onFocusAgent?: () => void;
}) {
  const stressed = district.health < 0.75 || district.load > 0.65;
  const deps = DEPS[district.kind] ?? [];

  return (
    <aside className="pixel-district-panel">
      <button type="button" className="pixel-district-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <p className="pixel-panel-title">⌂ {district.kind.toUpperCase()}</p>
      <h3 className="pixel-district-title">{district.name}</h3>
      <div className="pixel-district-bars">
        <div className="pixel-district-bar-row">
          <span>HP</span>
          <div className="pixel-district-bar">
            <div className="pixel-district-fill hp" style={{ width: `${district.health * 100}%` }} />
          </div>
          <span>{Math.round(district.health * 100)}%</span>
        </div>
        <div className="pixel-district-bar-row">
          <span>LOAD</span>
          <div className="pixel-district-bar">
            <div
              className="pixel-district-fill load"
              style={{ width: `${district.load * 100}%` }}
            />
          </div>
          <span>{Math.round(district.load * 100)}%</span>
        </div>
      </div>
      {stressed && (
        <p className="pixel-district-warn">⚠ HIGH PRESSURE — minds are loss-averse here</p>
      )}
      {deps.length > 0 && (
        <p className="pixel-district-deps">
          DEPS{" "}
          {deps.map((d) => (
            <span key={d} className="pixel-dep-chip">
              {d}
            </span>
          ))}
        </p>
      )}
      <p className="pixel-district-flavor">
        {FLAVOR[district.kind] ?? "Synthetic operators patrol this district."}
      </p>
      <div className="pixel-district-actions">
        {onFocusAgent && (
          <button type="button" className="pixel-btn pixel-btn-primary" onClick={onFocusAgent}>
            ✦ SEND FORGE
          </button>
        )}
        <p className="pixel-district-hint">Press R to rehearse cutover</p>
      </div>
    </aside>
  );
}

const FLAVOR: Record<string, string> = {
  billing: "Checkout ghosts, coupon contracts, finance close anxiety.",
  auth: "Sessions, MFA edges, legacy login quirks.",
  api: "Webhooks, retries, downstream client anger.",
  data: "Migrations, backfills, schema reference points.",
  support: "Tickets spawn when trust drops below threshold.",
  finance: "Month-end, refunds, revenue recognition minds.",
  security: "Attackers probe during every migration window.",
  edge: "CDN, latency-sensitive buyers, canary cohorts.",
};
