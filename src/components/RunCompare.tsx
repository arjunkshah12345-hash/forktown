import Link from "next/link";
import type { RehearsalRun } from "@/lib/sim/types";

export function RunCompare({ runs }: { runs: RehearsalRun[] }) {
  const pair = runs.slice(0, 2);
  if (pair.length < 2) return null;

  const [latest, prev] = pair;
  const delta =
    latest.report && prev.report ? latest.report.overall - prev.report.overall : null;
  const trustDelta =
    latest.report?.subjective && prev.report?.subjective
      ? latest.report.subjective.meanTrust - prev.report.subjective.meanTrust
      : null;
  const churnDelta =
    latest.report?.subjective && prev.report?.subjective
      ? latest.report.subjective.churnReady - prev.report.subjective.churnReady
      : null;

  return (
    <div className="mt-6 rounded-2xl border border-[var(--hairline)] bg-white/45 px-4 py-4">
      <p className="font-display text-xs uppercase tracking-[0.14em] text-ink-soft">Run compare</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {[latest, prev].map((r, i) => (
          <Link
            key={r.id}
            href={`/runs/${r.id}`}
            className="rounded-xl border border-[var(--hairline)] bg-white/60 px-3 py-3 transition hover:bg-white"
          >
            <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft">
              {i === 0 ? "Latest" : "Previous"}
            </p>
            <p className="font-display mt-1 text-lg font-semibold capitalize">{r.status}</p>
            <p className="font-display tele-line text-2xl font-semibold">
              {r.report ? `${(r.report.overall * 100).toFixed(0)}%` : "—"}
            </p>
            {r.report?.hypothesis && (
              <p className="mt-1 font-display text-[10px] uppercase tracking-wider text-ink-soft">
                hyp {r.report.hypothesis.status}
              </p>
            )}
          </Link>
        ))}
      </div>
      <div className="font-mono mt-3 space-y-1 text-xs text-ink-soft">
        {delta != null && (
          <p>
            Δ survivability {delta >= 0 ? "+" : ""}
            {(delta * 100).toFixed(1)}%
          </p>
        )}
        {trustDelta != null && (
          <p>
            Δ trust {trustDelta >= 0 ? "+" : ""}
            {(trustDelta * 100).toFixed(0)}pts
            {churnDelta != null ? ` · Δ churn ${churnDelta >= 0 ? "+" : ""}${churnDelta}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
