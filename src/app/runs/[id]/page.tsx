import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { LiveRunConsole } from "@/components/LiveRunConsole";
import { ExportReportButton } from "@/components/ExportReportButton";
import { WarRoom } from "@/components/WarRoom";
import { getPlan, getRun, getTown } from "@/lib/sim/store";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();
  const town = await getTown(run.townId);
  if (!town) notFound();
  const plan = await getPlan(run.planId);

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-5 pb-28 pt-28 sm:px-8">
        <Link
          href={`/towns/${town.slug === "acme-billing-town" ? town.slug : town.id}`}
          className="font-display text-sm text-ink-soft hover:text-ink"
        >
          ← {town.name}
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              <span className="beacon" />
              War room
            </p>
            <h1 className="font-display mt-3 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold tracking-tight">
              {plan?.title ?? "Migration rehearsal"}
            </h1>
            <p className="mt-2 text-ink-soft">
              Agent {plan?.agentName ?? "—"} · intensity {plan?.intensity ?? "—"} ·{" "}
              <span className="capitalize">{run.status}</span>
              {run.dialogue ? ` · ${run.dialogue.length} negotiation turns` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ExportReportButton runId={run.id} />
            <Link href={`/towns/${town.id}/rehearse`} className="btn-ghost">
              Run again
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <WarRoom run={run} districts={town.districts} />
        </div>

        <details className="mt-14 group">
          <summary className="font-display cursor-pointer text-sm text-ink-soft hover:text-ink">
            Raw chronograph log
          </summary>
          <div className="mt-6">
            <LiveRunConsole run={run} paceMs={280} />
          </div>
        </details>

        {run.report && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Survival report</h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-soft">{run.report.recommendation}</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {run.report.dimensions.map((d) => (
                <div
                  key={d.layer}
                  className="rounded-2xl border border-[var(--hairline)] bg-white/55 px-4 py-4"
                >
                  <p className="font-display text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                    {d.layer}
                  </p>
                  <p className="font-display tele-line mt-1 text-2xl font-semibold">
                    {(d.score * 100).toFixed(0)}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{d.note}</p>
                </div>
              ))}
            </div>

            {run.report.cascadingFailures.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display text-lg font-semibold">Cascading failures</h3>
                <ul className="mt-3 space-y-2">
                  {run.report.cascadingFailures.map((f) => (
                    <li key={f} className="border-b border-[var(--hairline)] pb-2 text-ink-soft">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {run.report.hypothesis && (
              <div className="mt-10 shell">
                <div className="shell-inner p-6">
                  <h3 className="font-display text-lg font-semibold">Hypothesis check</h3>
                  <p className="mt-1 font-display text-xs uppercase tracking-[0.14em] text-ink-soft">
                    {run.report.hypothesis.status} · coverage{" "}
                    {(run.report.hypothesis.coverage * 100).toFixed(0)}%
                    {run.report.fidelity != null
                      ? ` · fidelity ${(run.report.fidelity * 100).toFixed(0)}%`
                      : ""}
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink">{run.report.hypothesis.summary}</p>
                  {run.report.hypothesis.missing.length > 0 && (
                    <p className="mt-2 text-sm text-ink-soft">
                      Missing mitigations: {run.report.hypothesis.missing.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {run.report.cast && run.report.cast.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display text-lg font-semibold">Decisive cast</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {run.report.cast.map((c) => (
                    <article
                      key={c.id}
                      className="rounded-2xl border border-[var(--hairline)] bg-white/55 px-4 py-4"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-display font-semibold tracking-tight">{c.name}</h4>
                        <span className="font-mono text-[10px] uppercase text-ink-soft">{c.role}</span>
                      </div>
                      {c.segment && (
                        <p className="text-xs text-ink-soft">{c.segment}</p>
                      )}
                      <p className="mt-2 text-sm text-ink">
                        {c.topAction} · u={c.avgUtility} · {c.decisions} decisions
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        trust {(c.finalTrust * 100).toFixed(0)}% · anger {(c.finalAnger * 100).toFixed(0)}%
                      </p>
                      {c.memory && (
                        <p className="mt-2 border-t border-[var(--hairline)] pt-2 text-sm text-ink-soft">
                          “{c.memory}”
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {run.report.phaseSummaries && run.report.phaseSummaries.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display text-lg font-semibold">Phase breakdown</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {run.report.phaseSummaries.map((p) => (
                    <div
                      key={p.phase}
                      className="rounded-2xl border border-[var(--hairline)] bg-white/55 px-4 py-3"
                    >
                      <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft capitalize">
                        {p.phase}
                      </p>
                      <p className="font-display tele-line mt-1 text-xl font-semibold">
                        {p.trustDelta >= 0 ? "+" : ""}
                        {(p.trustDelta * 100).toFixed(0)}%
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">{p.events} events</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {run.report.tippingPoints && run.report.tippingPoints.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display text-lg font-semibold">Tipping points</h3>
                <ul className="mt-3 space-y-2">
                  {run.report.tippingPoints.map((t) => (
                    <li key={`${t.tick}-${t.kind}`} className="border-b border-[var(--hairline)] pb-2 text-ink-soft">
                      <span className="font-display text-xs uppercase tracking-wider text-ink">{t.kind.replace("_", " ")}</span>
                      {" · "}
                      {t.summary}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {run.report.nearMiss && (
              <p className="mt-8 rounded-2xl border border-[color-mix(in_oklab,var(--amber)_40%,transparent)] bg-[color-mix(in_oklab,var(--amber)_10%,white)] px-5 py-4 text-[15px] text-ink">
                {run.report.nearMiss}
              </p>
            )}

            {run.report.segments && run.report.segments.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display text-lg font-semibold">Segment pulse</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {run.report.segments.map((s) => (
                    <div
                      key={s.segment}
                      className="rounded-2xl border border-[var(--hairline)] bg-white/55 px-4 py-3"
                    >
                      <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft">{s.segment}</p>
                      <p className="font-display tele-line mt-1 text-xl font-semibold">
                        {(s.meanTrust * 100).toFixed(0)}%
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        anger {(s.meanAnger * 100).toFixed(0)}% · churn {s.churnReady}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {run.report.scenarioBeats && run.report.scenarioBeats.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display text-lg font-semibold">Scenario beats</h3>
                <ul className="mt-3 space-y-2">
                  {run.report.scenarioBeats.map((b) => (
                    <li key={`${b.phase}-${b.title}`} className="border-b border-[var(--hairline)] pb-2 text-ink-soft">
                      <span className="font-display text-xs uppercase tracking-wider text-ink">{b.phase}</span>
                      {" · "}
                      <span className="text-ink">{b.title}</span>
                      <span className="block text-sm">{b.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {run.report.subjective && (
              <div className="mt-10 shell">
                <div className="shell-inner p-6">
                  <h3 className="font-display text-lg font-semibold">Subjective aftermath</h3>
                  <p className="mt-2 text-sm text-ink-soft">
                    Mean trust {(run.report.subjective.meanTrust * 100).toFixed(0)}% · mean anger{" "}
                    {(run.report.subjective.meanAnger * 100).toFixed(0)}% · churn-ready minds{" "}
                    {run.report.subjective.churnReady}
                  </p>
                  {run.report.subjective.decisiveMoments.length > 0 && (
                    <ul className="mt-5 space-y-3">
                      {run.report.subjective.decisiveMoments.map((m) => (
                        <li
                          key={m.slice(0, 48)}
                          className="border-b border-[var(--hairline)] pb-3 text-[15px] leading-relaxed text-ink"
                        >
                          {m}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="mt-10">
              <h3 className="font-display text-lg font-semibold">Agent moves</h3>
              <ul className="mt-3 space-y-2">
                {run.report.agentActions.map((a) => (
                  <li key={a} className="font-display text-[15px] tracking-tight text-ink">
                    → {a}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
