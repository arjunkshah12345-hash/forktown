"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { District, RehearsalRun, SimulationPhase } from "@/lib/sim/types";
import { PixelWarMap } from "@/components/retro/PixelWarMap";
import { PixelPortrait } from "@/components/retro/PixelPortrait";
import { districtsToPixel } from "@/lib/pixel-map";
import { withBase } from "@/lib/paths";
import clsx from "clsx";

const PHASES: SimulationPhase[] = ["prepare", "canary", "cutover", "stress", "recovery"];

function TrustGraph({ values }: { values: number[] }) {
  const [el, setEl] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!el || values.length < 2) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.strokeStyle = "#66BB6A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 2 + (i / (values.length - 1)) * (el.width - 4);
      const y = el.height - 2 - Math.min(1, Math.max(0, v)) * (el.height - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [values, el]);
  return <canvas ref={setEl} width={220} height={56} className="pixel-trust-graph" />;
}

/** Pixel war room driven entirely by a real RehearsalRun payload. */
export function WarRoom({
  run,
  districts,
  paceMs = 480,
  compact = false,
}: {
  run: RehearsalRun;
  districts: District[];
  paceMs?: number;
  compact?: boolean;
}) {
  const timeline = useMemo(
    () => run.events.filter((e) => e.decision || e.kind === "scenario" || e.kind === "cascade"),
    [run.events],
  );
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const done = step >= timeline.length && timeline.length > 0;

  useEffect(() => {
    setStep(0);
    setPaused(false);
  }, [run.id]);

  useEffect(() => {
    if (!timeline.length || paused) return;
    const id = setInterval(() => {
      setStep((s) => (s >= timeline.length ? s : s + 1));
    }, paceMs);
    return () => clearInterval(id);
  }, [run.id, timeline.length, paceMs, paused]);

  const visible = timeline.slice(0, Math.max(0, step));
  const current = visible[visible.length - 1];
  const snapIdx = Math.min(current ? current.tick : 0, Math.max(0, run.snapshots.length - 1));
  const snap = run.snapshots[snapIdx] ?? run.snapshots[0];
  const dialogue = current?.dialogue ?? [];
  const phaseNow = (current?.phase ?? "prepare") as SimulationPhase;

  const liveDistricts = useMemo(() => {
    const ds = run.districtSnaps?.find((s) => s.tick === (current?.tick ?? 0));
    const base = districts.map((d) => {
      const hit = ds?.districts.find((x) => x.id === d.id);
      return hit ? { ...d, health: hit.health, load: hit.load } : d;
    });
    return districtsToPixel(base);
  }, [districts, run.districtSnaps, current?.tick]);

  const trustHistory = useMemo(
    () =>
      run.snapshots
        .slice(0, snapIdx + 1)
        .map((s) => s.meanTrust ?? 0.5)
        .filter((v) => Number.isFinite(v)),
    [run.snapshots, snapIdx],
  );

  const feed = useMemo(() => {
    return visible
      .slice(-12)
      .map((e) => {
        if (e.decision) return `${e.decision.mindName}: ${e.decision.label} (u=${e.decision.utility})`;
        if (e.kind === "cascade") return `CASCADE · ${e.title}`;
        return `${e.phase ?? "event"} · ${e.title}`;
      })
      .reverse();
  }, [visible]);

  const hotId = current?.districtId ?? run.report?.hottestDistrictId ?? null;
  const pressure = [
    ["TRUST", Math.round((snap?.meanTrust ?? 0.5) * 100), "#66BB6A"],
    ["ANGER", Math.round((snap?.meanAnger ?? 0.2) * 100), "#EF5350"],
    ["OUTAGE", Math.round(snap?.outagePercent ?? 0), "#42A5F5"],
    ["TICKETS", Math.min(100, (snap?.activeTickets ?? 0) * 4), "#FFA726"],
  ] as const;

  return (
    <div className={clsx("pixel-real-war", compact && "pixel-real-war-compact")}>
      <div className="pixel-real-war-rail">
        {PHASES.map((p) => (
          <span
            key={p}
            className={clsx(
              "pixel-phase-chip",
              p === phaseNow && "active",
              PHASES.indexOf(p) < PHASES.indexOf(phaseNow) && "done",
            )}
          >
            {p}
          </span>
        ))}
        <div className="pixel-real-war-controls">
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ‹
          </button>
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setPaused((v) => !v)}>
            {paused || done ? "▶" : "⏸"}
          </button>
          <button
            type="button"
            className="pixel-btn pixel-btn-ghost"
            onClick={() => setStep((s) => Math.min(timeline.length, s + 1))}
          >
            ›
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(1, timeline.length)}
            value={step}
            onChange={(e) => {
              setPaused(true);
              setStep(Number(e.target.value));
            }}
            className="pixel-scrub"
            aria-label="Scrub timeline"
          />
          <span className="font-pixel text-[0.38rem] text-[#bcaaa4]">
            {Math.min(step, timeline.length)}/{timeline.length}
          </span>
        </div>
      </div>

      <div className="pixel-war-grid pixel-real-war-grid">
        <div className="pixel-panel pixel-war-map-panel">
          <p className="pixel-panel-title">TOWN PULSE · t{snap?.tick ?? 0}</p>
          <PixelWarMap districts={liveDistricts} selectedId={hotId} pulseId={hotId} />
          {current && (
            <p className="pixel-sub mt-2">
              {current.decision
                ? `${current.decision.mindName}: ${current.decision.label}`
                : current.title}
            </p>
          )}
        </div>

        <div className="pixel-panel">
          <p className="pixel-panel-title">TRUST CURVE</p>
          <TrustGraph values={trustHistory.length ? trustHistory : [0.5, 0.5]} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Trust", snap?.meanTrust != null ? `${(snap.meanTrust * 100).toFixed(0)}%` : "—"],
              ["Anger", snap?.meanAnger != null ? `${(snap.meanAnger * 100).toFixed(0)}%` : "—"],
              ["Churn", String(snap?.churnIntent ?? "—")],
            ].map(([k, v]) => (
              <div key={k} className="px-stat !p-2">
                <p className="k">{k}</p>
                <p className="v !text-[0.55rem]">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pixel-panel pixel-war-log">
          <p className="pixel-panel-title">EVENT FEED</p>
          <ul className="pixel-log-scroll pixel-real-feed">
            {feed.length === 0 && <li>Minds entering the rehearsal…</li>}
            {feed.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="pixel-panel pixel-war-stats">
          <p className="pixel-panel-title">PRESSURE</p>
          {pressure.map(([label, val, col]) => (
            <div key={label} className="pixel-bar-row">
              <span className="pixel-bar-label">{label}</span>
              <div className="pixel-bar-track">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="pixel-bar-seg"
                    style={{
                      background: i < Math.round(Number(val) / 10) ? String(col) : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pixel-panel pixel-real-dialogue">
        <p className="pixel-panel-title">NEGOTIATION</p>
        <div className="pixel-real-turns">
          {!dialogue.length && (
            <p className="pixel-sub">Waiting for the first confrontation…</p>
          )}
          {dialogue.map((turn, i) => (
            <div
              key={`${current?.id}-${i}-${turn.text.slice(0, 16)}`}
              className={clsx(
                "pixel-turn",
                turn.speaker === "agent" && "agent",
                turn.tone === "hostile" && "hostile",
                turn.tone === "relieved" && "relieved",
              )}
            >
              <div className="pixel-dialogue-portrait shrink-0">
                <PixelPortrait
                  type={
                    turn.speaker === "agent"
                      ? "agent"
                      : turn.tone === "hostile"
                        ? "angry"
                        : "buyer"
                  }
                />
              </div>
              <div>
                <p className="font-pixel text-[0.38rem] uppercase text-[var(--px-gold)]">
                  {turn.name} · {turn.tone}
                </p>
                <p className="mt-1 font-retro text-[1.15rem] leading-snug text-[#fff8e7]">{turn.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {current?.decision && (
        <div className="pixel-panel p-4">
          <p className="pixel-panel-title">DECISION</p>
          <p className="font-pixel text-[0.5rem] text-[var(--px-cream)]">
            {current.decision.mindName} chose {current.decision.label}
          </p>
          <p className="mt-2 font-retro text-[1.1rem] text-[#d7ccc8]">{current.decision.rationale}</p>
        </div>
      )}

      {done && run.report && (
        <div
          className={clsx(
            "pixel-panel pixel-verdict",
            run.report.survived ? "survived" : "collapsed",
          )}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="pixel-panel-title">VERDICT</p>
              <p className="font-pixel text-[1.1rem] text-[var(--px-gold)]">
                {(run.report.overall * 100).toFixed(1)}%
              </p>
              <p className="mt-2 max-w-xl font-retro text-[1.15rem] text-[#fff8e7]">
                {run.report.verdict}
              </p>
              {run.report.hypothesis && (
                <p className="mt-2 font-retro text-[1.05rem] text-[#d7ccc8]">
                  Hypothesis {run.report.hypothesis.status} — {run.report.hypothesis.summary}
                </p>
              )}
            </div>
            <Link href={withBase(`/runs/${run.id}`)} className="pixel-btn pixel-btn-primary">
              FULL REPORT
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
