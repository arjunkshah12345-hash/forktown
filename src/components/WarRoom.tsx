"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { District, RehearsalRun, SimulationPhase } from "@/lib/sim/types";
import { TownMap } from "@/components/TownMap";
import { TrustSparkline } from "@/components/TrustSparkline";
import clsx from "clsx";

const TONE: Record<string, string> = {
  calm: "border-[var(--hairline)] bg-white/70",
  tense: "border-[color-mix(in_oklab,var(--amber)_35%,transparent)] bg-[color-mix(in_oklab,var(--amber)_8%,white)]",
  hostile: "border-[color-mix(in_oklab,var(--danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--danger)_7%,white)]",
  relieved: "border-[color-mix(in_oklab,var(--alive)_35%,transparent)] bg-[color-mix(in_oklab,var(--alive)_8%,white)]",
  tactical: "border-[color-mix(in_oklab,var(--canal)_35%,transparent)] bg-[color-mix(in_oklab,var(--canal)_8%,white)]",
};

const PHASES: SimulationPhase[] = ["prepare", "canary", "cutover", "stress", "recovery"];

export function WarRoom({
  run,
  districts,
  paceMs = 520,
}: {
  run: RehearsalRun;
  districts: District[];
  paceMs?: number;
}) {
  const timeline = useMemo(
    () => run.events.filter((e) => e.decision || e.kind === "scenario" || e.kind === "cascade"),
    [run.events],
  );
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const done = step >= timeline.length;

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
  const snapIdx = Math.min(current ? current.tick : 0, run.snapshots.length - 1);
  const snap = run.snapshots[snapIdx] ?? run.snapshots[0];
  const hot = current?.districtId ? [current.districtId] : [];
  if (run.report?.hottestDistrictId && !hot.includes(run.report.hottestDistrictId) && done) {
    hot.push(run.report.hottestDistrictId);
  }
  const dialogue = current?.dialogue ?? [];
  const liveDistricts = useMemo(() => {
    const ds = run.districtSnaps?.find((s) => s.tick === (current?.tick ?? 0));
    if (!ds) return districts;
    return districts.map((d) => {
      const hit = ds.districts.find((x) => x.id === d.id);
      return hit ? { ...d, health: hit.health, load: hit.load } : d;
    });
  }, [districts, run.districtSnaps, current?.tick]);

  const phaseNow = (current?.phase ?? "prepare") as SimulationPhase;

  return (
    <div className="space-y-6">
      {/* Phase rail */}
      <div className="shell">
        <div className="shell-inner flex flex-wrap items-center gap-2 px-4 py-3">
          {PHASES.map((p) => (
            <span
              key={p}
              className={clsx(
                "rounded-full px-3 py-1 font-display text-[10px] uppercase tracking-[0.14em]",
                p === phaseNow
                  ? "bg-ink text-paper"
                  : PHASES.indexOf(p) < PHASES.indexOf(phaseNow)
                    ? "bg-[color-mix(in_oklab,var(--alive)_18%,white)] text-ink"
                    : "bg-white/50 text-ink-soft",
              )}
            >
              {p}
            </span>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-ghost !px-3 !py-1 text-xs"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step <= 0}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn-ghost !px-3 !py-1 text-xs"
              onClick={() => setPaused((v) => !v)}
            >
              {paused || done ? "▶ Play" : "⏸ Pause"}
            </button>
            <button
              type="button"
              className="btn-ghost !px-3 !py-1 text-xs"
              onClick={() => setStep((s) => Math.min(timeline.length, s + 1))}
              disabled={step >= timeline.length}
            >
              ›
            </button>
            <input
              type="range"
              min={0}
              max={timeline.length}
              value={step}
              onChange={(e) => {
                setPaused(true);
                setStep(Number(e.target.value));
              }}
              className="w-28 accent-[var(--amber)] sm:w-40"
              aria-label="Scrub timeline"
            />
            <p className="font-mono text-xs text-ink-soft">
              {Math.min(step, timeline.length)}/{timeline.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="shell">
          <TownMap
            districts={liveDistricts}
            highlightIds={hot}
            live
            pulseLabel={
              current?.kind === "scenario"
                ? current.title
                : current?.decision
                  ? `${current.decision.mindName}: ${current.decision.label}`
                  : current?.title
            }
            className="h-[300px] sm:h-[380px]"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="shell">
            <div className="shell-inner p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">War room</p>
                <p className="font-mono text-xs text-ink-soft">tick {snap?.tick ?? 0}</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["Trust", snap?.meanTrust != null ? `${(snap.meanTrust * 100).toFixed(0)}%` : "—"],
                  ["Anger", snap?.meanAnger != null ? `${(snap.meanAnger * 100).toFixed(0)}%` : "—"],
                  ["Churn", String(snap?.churnIntent ?? "—")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft">{k}</p>
                    <p className="font-display tele-line mt-1 text-2xl font-semibold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between font-display text-[10px] uppercase tracking-wider text-ink-soft">
                  <span>Trust</span>
                  <span>Anger</span>
                </div>
                <TrustSparkline snapshots={run.snapshots.slice(0, snapIdx + 1)} />
              </div>
              {snap?.outagePercent != null && snap.outagePercent > 0 && (
                <p className="mt-3 font-display text-xs text-danger">
                  Outage {snap.outagePercent.toFixed(1)}% · tickets {snap.activeTickets}
                </p>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                className="shell"
              >
                <div className="shell-inner p-5">
                  <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
                    t{current.tick}
                    {current.phase ? ` · ${current.phase}` : ""}
                    {current.kind === "scenario"
                      ? " · scenario"
                      : current.kind === "cascade"
                        ? " · cascade"
                        : current.decision
                          ? ` · ${current.decision.role}`
                          : ""}
                  </p>
                  <h3 className="font-display mt-2 text-xl font-semibold tracking-tight">
                    {current.decision?.mindName ?? current.title}
                  </h3>
                  {current.decision ? (
                    <>
                      <p className="mt-1 text-sm text-ink-soft">
                        Chose <span className="font-medium text-ink">{current.decision.label}</span>
                        {" · "}u={current.decision.utility}
                        {current.decision.runnerUp
                          ? ` · vs ${current.decision.runnerUp.label}`
                          : ""}
                      </p>
                      <p className="mt-3 text-[14px] leading-relaxed text-ink">{current.decision.rationale}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-[14px] leading-relaxed text-ink">{current.detail}</p>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="shell">
                <div className="shell-inner p-5 font-display text-sm text-ink-soft">
                  Minds entering the rehearsal…
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="shell">
        <div className="shell-inner overflow-hidden">
          <div className="border-b border-[var(--hairline)] px-5 py-3">
            <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Negotiation</p>
          </div>
          <div className="max-h-[340px] space-y-3 overflow-y-auto px-5 py-4">
            <AnimatePresence initial={false}>
              {dialogue.map((turn, i) => (
                <motion.div
                  key={`${current?.id}-${i}-${turn.text.slice(0, 20)}`}
                  initial={{ opacity: 0, x: turn.speaker === "agent" ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  className={clsx(
                    "max-w-[92%] rounded-2xl border px-4 py-3",
                    turn.speaker === "agent" ? "ml-auto" : "mr-auto",
                    TONE[turn.tone] ?? TONE.calm,
                  )}
                >
                  <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft">
                    {turn.name} · {turn.tone}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink">{turn.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {!dialogue.length && (
              <p className="font-display text-sm text-ink-soft">Waiting for the first confrontation…</p>
            )}
          </div>
        </div>
      </div>

      {done && run.report && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="shell">
            <div
              className={clsx(
                "shell-inner flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8",
                run.report.survived
                  ? "bg-[color-mix(in_oklab,var(--alive)_8%,white)]"
                  : "bg-[color-mix(in_oklab,var(--danger)_8%,white)]",
              )}
            >
              <div>
                <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Verdict</p>
                <p className="font-display mt-2 text-4xl font-semibold tracking-tight">
                  {(run.report.overall * 100).toFixed(1)}%
                </p>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">{run.report.verdict}</p>
                {run.report.nearMiss && (
                  <p className="mt-3 max-w-xl text-sm font-medium text-amber">{run.report.nearMiss}</p>
                )}
                {run.report.hypothesis && (
                  <p className="mt-2 max-w-xl text-sm text-ink-soft">
                    <span className="font-display uppercase tracking-wider text-[10px] text-ink">
                      Hypothesis {run.report.hypothesis.status}
                    </span>
                    {" — "}
                    {run.report.hypothesis.summary}
                  </p>
                )}
                {run.report.fidelity != null && (
                  <p className="mt-2 font-mono text-xs text-ink-soft">
                    Fidelity {(run.report.fidelity * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              <div className="font-display text-sm text-ink-soft">
                trust {((run.report.subjective?.meanTrust ?? 0) * 100).toFixed(0)}% · churn-ready{" "}
                {run.report.subjective?.churnReady ?? 0}
              </div>
            </div>
          </div>

          {run.report.segments && run.report.segments.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {run.report.segments.map((s) => (
                <div key={s.segment} className="rounded-2xl border border-[var(--hairline)] bg-white/55 px-4 py-3">
                  <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft">{s.segment}</p>
                  <p className="font-display mt-1 text-lg font-semibold">
                    {(s.meanTrust * 100).toFixed(0)}% trust
                  </p>
                  <p className="text-xs text-ink-soft">
                    anger {(s.meanAnger * 100).toFixed(0)}% · churn {s.churnReady}/{s.count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
