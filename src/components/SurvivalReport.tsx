"use client";

import type { RehearsalRun } from "@/lib/sim/types";
import { PixelPortrait } from "@/components/retro/PixelPortrait";

export function SurvivalReport({ run }: { run: RehearsalRun }) {
  const report = run.report;
  if (!report) {
    return (
      <div className="px-panel p-5">
        <p className="pixel-panel-title">REPORT PENDING</p>
        <p className="px-body px-muted">This run has no survival report yet.</p>
      </div>
    );
  }

  const letter =
    report.overall >= 0.9
      ? "S"
      : report.overall >= 0.8
        ? "A"
        : report.overall >= 0.7
          ? "B"
          : report.overall >= 0.55
            ? "C"
            : report.overall >= 0.4
              ? "D"
              : "F";

  return (
    <section className="pixel-survival">
      <div className={`pixel-panel pixel-verdict ${report.survived ? "survived" : "collapsed"}`}>
        <p className="pixel-panel-title">{report.survived ? "★ TOWN HELD" : "☠ TOWN COLLAPSED"}</p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <p className="font-pixel text-[2.4rem] leading-none text-[var(--px-gold)]">{letter}</p>
          <p className="font-pixel text-[1.25rem] text-[var(--px-gold)]">
            {(report.overall * 100).toFixed(1)}%
          </p>
        </div>
        <p className="mt-3 max-w-2xl font-retro text-[1.25rem] text-[#fff8e7]">{report.verdict}</p>
        <p className="mt-2 max-w-2xl font-retro text-[1.1rem] text-[#d7ccc8]">{report.recommendation}</p>
        {report.nearMiss && (
          <p className="mt-3 border-2 border-[var(--px-gold)] bg-[#3e2a10] px-3 py-2 font-retro text-[1.1rem]">
            {report.nearMiss}
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {report.dimensions.map((d) => (
          <div key={d.layer} className="px-stat">
            <p className="k">{d.layer}</p>
            <p className="v">{(d.score * 100).toFixed(0)}</p>
            <p className="mt-1 font-retro text-[0.95rem] text-[#bcaaa4]">{d.note}</p>
          </div>
        ))}
      </div>

      {report.hypothesis && (
        <div className="mt-3 px-panel p-5">
          <p className="pixel-panel-title">HYPOTHESIS · {report.hypothesis.status}</p>
          <p className="font-pixel text-[0.42rem] text-[#bcaaa4]">
            coverage {(report.hypothesis.coverage * 100).toFixed(0)}%
            {report.fidelity != null ? ` · fidelity ${(report.fidelity * 100).toFixed(0)}%` : ""}
          </p>
          <p className="mt-3 font-retro text-[1.15rem] text-[#fff8e7]">{report.hypothesis.summary}</p>
          {report.hypothesis.missing.length > 0 && (
            <p className="mt-2 font-retro text-[1.05rem] text-[#ef9a9a]">
              Missing: {report.hypothesis.missing.join(", ")}
            </p>
          )}
        </div>
      )}

      {report.cast && report.cast.length > 0 && (
        <div className="mt-3">
          <p className="pixel-panel-title mb-2">DECISIVE CAST</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.cast.map((c) => (
              <article key={c.id} className="pixel-dialogue-card">
                <div className="flex gap-3">
                  <div className="pixel-dialogue-portrait shrink-0">
                    <PixelPortrait
                      type={c.finalAnger > 0.55 ? "angry" : c.role.includes("agent") ? "agent" : "buyer"}
                    />
                  </div>
                  <div>
                    <p className="font-pixel text-[0.48rem] text-[var(--px-gold)]">{c.name}</p>
                    <p className="font-pixel text-[0.35rem] uppercase text-[#bcaaa4]">{c.role}</p>
                    <p className="mt-2 font-retro text-[1.05rem] text-[#fff8e7]">
                      {c.topAction} · u={c.avgUtility}
                    </p>
                    <p className="font-retro text-[0.95rem] text-[#bcaaa4]">
                      trust {(c.finalTrust * 100).toFixed(0)}% · anger {(c.finalAnger * 100).toFixed(0)}%
                    </p>
                    {c.memory && (
                      <p className="mt-2 border-t-2 border-[var(--px-border)] pt-2 font-retro text-[1.05rem] text-[#d7ccc8]">
                        “{c.memory}”
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {report.phaseSummaries && report.phaseSummaries.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {report.phaseSummaries.map((p) => (
            <div key={p.phase} className="px-stat">
              <p className="k">{p.phase}</p>
              <p className="v">
                {p.trustDelta >= 0 ? "+" : ""}
                {(p.trustDelta * 100).toFixed(0)}%
              </p>
              <p className="mt-1 font-retro text-[0.9rem] text-[#bcaaa4]">{p.events} events</p>
            </div>
          ))}
        </div>
      )}

      {report.tippingPoints && report.tippingPoints.length > 0 && (
        <div className="mt-3 px-panel p-5">
          <p className="pixel-panel-title">TIPPING POINTS</p>
          <ul className="mt-2">
            {report.tippingPoints.map((t) => (
              <li key={`${t.tick}-${t.kind}`} className="px-list-row font-retro text-[1.1rem] text-[#d7ccc8]">
                <span className="font-pixel text-[0.38rem] uppercase text-[var(--px-gold)]">
                  {t.kind.replace("_", " ")}
                </span>{" "}
                {t.summary}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.cascadingFailures.length > 0 && (
        <div className="mt-3 border-4 border-[var(--px-danger)] bg-[#3e1a16] p-4">
          <p className="pixel-panel-title text-[var(--px-danger)]">CASCADES</p>
          <ul className="mt-2 space-y-1">
            {report.cascadingFailures.map((f) => (
              <li key={f} className="font-retro text-[1.1rem] text-[#ffcdd2]">
                → {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.segments && report.segments.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {report.segments.map((s) => (
            <div key={s.segment} className="px-stat">
              <p className="k">{s.segment}</p>
              <p className="v">{(s.meanTrust * 100).toFixed(0)}%</p>
              <p className="mt-1 font-retro text-[0.9rem] text-[#bcaaa4]">
                anger {(s.meanAnger * 100).toFixed(0)}% · churn {s.churnReady}
              </p>
            </div>
          ))}
        </div>
      )}

      {report.subjective && (
        <div className="mt-3 px-panel p-5">
          <p className="pixel-panel-title">SUBJECTIVE AFTERMATH</p>
          <p className="font-retro text-[1.1rem] text-[#d7ccc8]">
            Mean trust {(report.subjective.meanTrust * 100).toFixed(0)}% · anger{" "}
            {(report.subjective.meanAnger * 100).toFixed(0)}% · churn-ready{" "}
            {report.subjective.churnReady}
          </p>
          <ul className="mt-3">
            {report.subjective.decisiveMoments.map((m) => (
              <li key={m.slice(0, 40)} className="px-list-row font-retro text-[1.1rem] text-[#fff8e7]">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.neural && (
        <div className="mt-3 px-panel p-5">
          <p className="pixel-panel-title">NEURAL POLICY · WEAPON LAYER</p>
          <p className="font-pixel text-[0.38rem] text-[#bcaaa4]">
            {report.neural.mindPolicy} · {report.neural.agentPolicy} · α={report.neural.alpha}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Decisions", String(report.neural.decisions)],
              ["Policy entropy", report.neural.meanPolicyEntropy.toFixed(3)],
              ["EU↔net gap", report.neural.meanProspectGap.toFixed(3)],
              ["Agent plan q", report.neural.agentPlanScore.toFixed(3)],
              ["Replans", String(report.neural.replans)],
              ["Belief trust", `${(report.neural.beliefFinal.meanExpectedTrust * 100).toFixed(0)}%`],
              ["Belief p(survive)", report.neural.beliefFinal.meanPSurvive.toFixed(3)],
              ["Fidelity", report.fidelity != null ? `${(report.fidelity * 100).toFixed(0)}%` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="px-stat">
                <p className="k">{k}</p>
                <p className="v">{v}</p>
              </div>
            ))}
          </div>
          {report.neural.topFeatures.length > 0 && (
            <div className="mt-3">
              <p className="font-pixel text-[0.38rem] uppercase text-[var(--px-gold)]">Top drivers</p>
              <ul className="mt-2">
                {report.neural.topFeatures.slice(0, 6).map((f) => (
                  <li key={f.feature} className="font-retro text-[1.05rem] text-[#d7ccc8]">
                    {f.feature} · {f.weight.toFixed(3)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.neural.agentMovesRanked.length > 0 && (
            <div className="mt-3">
              <p className="font-pixel text-[0.38rem] uppercase text-[var(--px-gold)]">Agent net ranking</p>
              <ul className="mt-2">
                {report.neural.agentMovesRanked.slice(0, 5).map((m) => (
                  <li key={m.move} className="font-pixel text-[0.4rem] leading-relaxed text-[var(--px-cream)]">
                    q={m.score.toFixed(2)} · {m.move}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 px-panel p-5">
        <p className="pixel-panel-title">AGENT MOVES</p>
        <ul className="mt-2">
          {report.agentActions.map((a) => (
            <li key={a} className="font-pixel text-[0.45rem] leading-relaxed text-[var(--px-cream)]">
              → {a}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
