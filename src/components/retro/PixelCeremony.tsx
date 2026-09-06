"use client";

import { useEffect, useState } from "react";
import type { RehearsalRun } from "@/lib/sim/types";

function grade(score: number): string {
  if (score >= 0.9) return "S";
  if (score >= 0.8) return "A";
  if (score >= 0.7) return "B";
  if (score >= 0.55) return "C";
  if (score >= 0.4) return "D";
  return "F";
}

export function PixelCeremony({
  run,
  onContinue,
  onReport,
}: {
  run: RehearsalRun;
  onContinue: () => void;
  onReport: () => void;
}) {
  const report = run.report;
  const survived = Boolean(report?.survived);
  const score = report?.overall ?? 0;
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    setReveal(0);
    const t1 = window.setTimeout(() => setReveal(1), 180);
    const t2 = window.setTimeout(() => setReveal(2), 520);
    const t3 = window.setTimeout(() => setReveal(3), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [run.id]);

  return (
    <div className="pixel-ceremony" role="dialog" aria-modal>
      <div className={`pixel-ceremony-card ${survived ? "ok" : "bad"}`}>
        <p className="pixel-ceremony-eyebrow">
          {survived ? "★ CUTOVER CEREMONY" : "☠ COLLAPSE RITES"}
        </p>
        <p className={`pixel-ceremony-grade ${reveal >= 1 ? "in" : ""}`}>{grade(score)}</p>
        <p className={`pixel-ceremony-score ${reveal >= 2 ? "in" : ""}`}>
          {(score * 100).toFixed(1)}% · {run.status.toUpperCase()}
        </p>
        <p className={`pixel-ceremony-verdict ${reveal >= 3 ? "in" : ""}`}>
          {report?.verdict ?? "The town holds its breath."}
        </p>
        {report?.nearMiss && (
          <p className="pixel-ceremony-near">{report.nearMiss}</p>
        )}
        <div className="pixel-ceremony-dims">
          {(report?.dimensions ?? []).slice(0, 4).map((d) => (
            <div key={d.layer}>
              <span>{d.layer}</span>
              <strong>{(d.score * 100).toFixed(0)}</strong>
            </div>
          ))}
        </div>
        <div className="pixel-ceremony-actions">
          <button type="button" className="pixel-btn pixel-btn-primary" onClick={onContinue}>
            ⚔ ENTER WAR ROOM
          </button>
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={onReport}>
            FULL REPORT
          </button>
        </div>
      </div>
    </div>
  );
}
