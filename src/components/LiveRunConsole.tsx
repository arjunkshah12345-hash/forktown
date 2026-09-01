"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RehearsalRun } from "@/lib/sim/types";
import clsx from "clsx";

export function LiveRunConsole({ run, paceMs = 380 }: { run: RehearsalRun; paceMs?: number }) {
  const [i, setI] = useState(0);
  const decisions = useMemo(() => run.events.filter((e) => e.decision), [run.events]);

  useEffect(() => {
    setI(0);
    if (!run.liveLog.length) return;
    const id = setInterval(() => {
      setI((prev) => {
        if (prev >= run.liveLog.length - 1) {
          clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, paceMs);
    return () => clearInterval(id);
  }, [run.id, run.liveLog.length, paceMs]);

  const visible = run.liveLog.slice(0, i + 1);
  const snapIdx = Math.min(
    Math.floor((i / Math.max(1, run.liveLog.length - 1)) * (run.snapshots.length - 1)),
    run.snapshots.length - 1,
  );
  const snap = run.snapshots[snapIdx];
  const visibleDecisions = decisions.slice(
    0,
    Math.max(1, Math.ceil((i / Math.max(1, run.liveLog.length)) * decisions.length)),
  );
  const latest = visibleDecisions[visibleDecisions.length - 1];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="shell">
        <div className="shell-inner overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
            <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
              Subjective chronograph
            </p>
            <p className="font-mono text-xs text-ink-soft">
              tick {snap?.tick ?? 0}/{run.ticks}
            </p>
          </div>
          <div className="max-h-[420px] space-y-1.5 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-relaxed text-ink">
            <AnimatePresence initial={false}>
              {visible.map((line, idx) => (
                <motion.p
                  key={`${idx}-${line.slice(0, 24)}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className={clsx(
                    line.includes("SURVIVED") && "text-alive font-medium",
                    line.includes("COLLAPSED") && "text-danger font-medium",
                    line.startsWith("Agent") && "text-canal",
                    line.startsWith("──") && "mt-2 font-medium text-amber",
                    line.includes("↳ agent counter") && "text-canal",
                    line.includes("ERROR BUDGET") && "text-danger font-medium",
                    line.trimStart().startsWith("t") === false &&
                      line.includes("chose") === false &&
                      line.startsWith("     ") &&
                      "text-ink-soft/80 pl-2",
                  )}
                >
                  <span className="mr-2 text-ink-soft/50">{String(idx).padStart(2, "0")}</span>
                  {line}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="shell">
          <div className="shell-inner p-5">
            <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Town pulse</p>
            <dl className="mt-4 space-y-3">
              {[
                ["Traffic", `${snap?.trafficRps ?? 0} rps`],
                ["Tickets", String(snap?.activeTickets ?? 0)],
                ["Outage", `${snap?.outagePercent ?? 0}%`],
                ["$ at risk", `$${snap?.revenueAtRisk ?? 0}`],
                ["Mean trust", snap?.meanTrust != null ? `${(snap.meanTrust * 100).toFixed(0)}%` : "—"],
                ["Mean anger", snap?.meanAnger != null ? `${(snap.meanAnger * 100).toFixed(0)}%` : "—"],
                ["Churn-intent", String(snap?.churnIntent ?? "—")],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between gap-3 border-b border-[var(--hairline)] pb-2"
                >
                  <dt className="font-display text-sm text-ink-soft">{k}</dt>
                  <dd className="font-display tele-line text-lg font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {latest?.decision && (
          <motion.div
            key={latest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="shell"
          >
            <div className="shell-inner p-5">
              <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
                Latest mind decision
              </p>
              <p className="font-display mt-2 text-lg font-semibold tracking-tight">
                {latest.decision.mindName}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {latest.decision.label} · u={latest.decision.utility}
                {latest.decision.runnerUp
                  ? ` · vs “${latest.decision.runnerUp.label}” (${latest.decision.runnerUp.utility})`
                  : ""}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink">{latest.decision.rationale}</p>
              <p className="font-mono mt-3 text-[11px] text-ink-soft">
                affect → trust {latest.decision.affectAfter.trust} · anger{" "}
                {latest.decision.affectAfter.anger} · anxiety {latest.decision.affectAfter.anxiety}
              </p>
            </div>
          </motion.div>
        )}

        {i >= run.liveLog.length - 1 && run.report && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="shell">
            <div
              className={clsx(
                "shell-inner p-5",
                run.report.survived
                  ? "bg-[color-mix(in_oklab,var(--alive)_8%,white)]"
                  : "bg-[color-mix(in_oklab,var(--danger)_8%,white)]",
              )}
            >
              <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Survivability</p>
              <p className="font-display mt-2 text-4xl font-semibold tracking-tight">
                {(run.report.overall * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{run.report.verdict}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
