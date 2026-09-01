"use client";

import { useEffect, useRef, useState } from "react";
import type { SampleDistrict } from "./sample-data";

function PixelBar({ label, value, color }: { label: string; value: number; color: string }) {
  const filled = Math.round(value / 10);
  return (
    <div className="pixel-bar-row">
      <span className="pixel-bar-label">{label}</span>
      <div className="pixel-bar-track">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="pixel-bar-seg"
            style={{ background: i < filled ? color : undefined }}
          />
        ))}
      </div>
      <span className="pixel-bar-val">{value}%</span>
    </div>
  );
}

function MiniTrust({ values }: { values: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#66BB6A";
    ctx.lineWidth = 1;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 2 + (i / (values.length - 1)) * (c.width - 4);
      const y = c.height - 2 - (v / 100) * (c.height - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [values]);
  return <canvas ref={ref} width={160} height={28} className="pixel-mini-trust" />;
}

const PHASE_ICON: Record<string, string> = {
  NIGHT: "☾",
  DAWN: "🌤",
  DAY: "☀",
  DUSK: "🌅",
};

export function PixelHUD({
  stats,
  selected,
  trustHistory,
  dayPhase = "DAY",
  season = "SPRING",
  xp = 0,
  level = 1,
  maraTrust = 42,
  energy = 100,
}: {
  stats: {
    survivability: number;
    trust: number;
    anger: number;
    churnReady: number;
    negotiationTurns: number;
    status: string;
  };
  selected: SampleDistrict | null;
  trustHistory?: number[];
  dayPhase?: string;
  season?: string;
  xp?: number;
  level?: number;
  maraTrust?: number;
  energy?: number;
}) {
  const [clock, setClock] = useState("4:20 PM");
  const xpPct = Math.min(100, (xp % 100));

  useEffect(() => {
    let t = 16 * 60 + 20;
    const id = setInterval(() => {
      t += 1;
      const h = Math.floor(t / 60) % 24;
      const m = t % 60;
      const am = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      setClock(`${h12}:${m.toString().padStart(2, "0")} ${am}`);
    }, 800);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="pixel-hud">
      <div className="pixel-panel pixel-panel-gold">
        <p className="pixel-panel-title">◆ STATUS</p>
        <p className={`pixel-status pixel-status-${stats.status}`}>{stats.status.toUpperCase()}</p>
        <p className="pixel-big-num">{stats.survivability.toFixed(1)}%</p>
        <p className="pixel-sub">survivability</p>
      </div>

      <div className="pixel-panel">
        <p className="pixel-panel-title">♥ TOWN MOOD</p>
        {trustHistory && (
          <>
            <MiniTrust values={trustHistory} />
            <p className="pixel-sub">trust trend</p>
          </>
        )}
        <PixelBar label="TRUST" value={stats.trust} color="#66BB6A" />
        <PixelBar label="ANGER" value={stats.anger} color="#EF5350" />
        <div className="pixel-hearts">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < 5 - stats.churnReady ? "on" : "off"}>
              ♥
            </span>
          ))}
        </div>
        <p className="pixel-stat-line">
          CHURN-READY <span>{stats.churnReady}</span>
        </p>
        <p className="pixel-stat-line">
          TALKS <span>{stats.negotiationTurns}</span>
        </p>
      </div>

      <div className="pixel-panel">
        <p className="pixel-panel-title">★ AGENT LV {level}</p>
        <div className="pixel-xp-track">
          <div className="pixel-xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <p className="pixel-sub">
          XP {xp} · next {100 - xpPct}
        </p>
        <p className="pixel-panel-title" style={{ marginTop: "0.55rem" }}>
          ⚡ FORGE ENERGY
        </p>
        <div className="pixel-energy-track">
          <div
            className="pixel-energy-fill"
            style={{ width: `${Math.max(0, Math.min(100, energy))}%` }}
          />
        </div>
        <p className="pixel-sub">{Math.round(energy)} / 100</p>
      </div>

      <div className="pixel-panel">
        <p className="pixel-panel-title">♡ MARA BOND</p>
        <div className="pixel-hearts pixel-mara-hearts">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < Math.round(maraTrust / 20) ? "on" : "off"}>
              ♥
            </span>
          ))}
        </div>
        <p className="pixel-stat-line">
          TRUST <span>{Math.round(maraTrust)}%</span>
        </p>
      </div>

      {selected && (
        <div className="pixel-panel pixel-panel-select">
          <p className="pixel-panel-title">⌂ DISTRICT</p>
          <p className="pixel-district-name">{selected.name}</p>
          <p className="pixel-stat-line">
            KIND <span>{selected.kind}</span>
          </p>
          <PixelBar label="HP" value={Math.round(selected.health * 100)} color="#42A5F5" />
          <PixelBar label="LOAD" value={Math.round(selected.load * 100)} color="#FFA726" />
        </div>
      )}

      <div className="pixel-panel pixel-panel-mini">
        <p className="pixel-panel-title">
          {PHASE_ICON[dayPhase] ?? "☀"} {season} · DAY 14 · {dayPhase}
        </p>
        <p className="pixel-clock">{clock}</p>
        <p className="pixel-sub">click town · R rehearse</p>
      </div>
    </aside>
  );
}
