import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { TownMap } from "@/components/TownMap";
import { WorldMeters } from "@/components/WorldMeters";
import { MindCard } from "@/components/MindCard";
import { TownTicker } from "@/components/TownTicker";
import { QuickRehearse } from "@/components/QuickRehearse";
import { ResyncButton } from "@/components/ResyncButton";
import { RunCompare } from "@/components/RunCompare";
import { primaryPlaybook } from "@/lib/github/playbook";
import { inventBuyerMind, inventActorMind, cohortStats, hydrateMinds } from "@/lib/sim/mind";
import { createPrng } from "@/lib/sim/prng";
import { getTown, listPlans, listRuns } from "@/lib/sim/store";

export const dynamic = "force-dynamic";

export default async function TownDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const town = await getTown(id);
  if (!town) notFound();
  const plans = await listPlans(town.id);
  const runs = await listRuns(town.id);

  const rng = createPrng(town.seed ^ 0x5549);
  const buyerMinds = town.users
    .filter((u) => u.mind || u.segment === "legacy" || u.anger > 0.45)
    .slice(0, 6)
    .map((u) => u.mind ?? inventBuyerMind(u, rng));
  const actorMinds = town.actors.map((a) => a.mind ?? inventActorMind(a, rng));
  const census = cohortStats(hydrateMinds(town.users, town.actors, town.seed));
  const fingerprint = town.fingerprint;
  const repoUrl = town.repoUrl;
  const canResync = Boolean(fingerprint?.localPath || repoUrl);
  const playbook = primaryPlaybook(fingerprint);

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-5 pb-28 pt-28 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">
              <span className="beacon" />
              Live town
            </p>
            <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-tight">
              {town.name}
            </h1>
            <p className="font-mono mt-2 text-sm text-ink-soft">{town.codebase}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickRehearse townId={town.id} playbook={playbook} />
            <Link href={`/towns/${town.id}/rehearse`} className="btn-ghost">
              Custom rehearsal
            </Link>
            {canResync && <ResyncButton townId={town.id} />}
          </div>
        </div>

        <div className="mt-8">
          <TownTicker />
        </div>

        {fingerprint && (
          <section className="mt-8 shell">
            <div className="shell-inner p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
                    Repo fingerprint
                  </p>
                  <h2 className="font-display mt-2 text-xl font-semibold tracking-tight">
                    {fingerprint.fullName}
                  </h2>
                  <p className="font-mono mt-1 text-xs text-ink-soft">
                    {fingerprint.filesSampled} files · ★ {fingerprint.stars} · branch{" "}
                    {fingerprint.defaultBranch}
                  </p>
                </div>
                {repoUrl && (
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost text-sm"
                  >
                    Open on GitHub
                  </a>
                )}
                {fingerprint.source === "local" && fingerprint.localPath && (
                  <p className="font-mono text-[10px] text-ink-soft">{fingerprint.localPath}</p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  fingerprint.hasBilling && "billing",
                  fingerprint.hasStripe && "stripe",
                  fingerprint.hasAuth && "auth",
                  fingerprint.hasMigrations && "migrations",
                  fingerprint.hasWebhooks && "webhooks",
                  ...fingerprint.suggestedMigrations.map((m) => `rehearse:${m}`),
                ]
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={String(t)}
                      className="font-mono rounded-full bg-ink/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-ink-soft"
                    >
                      {t}
                    </span>
                  ))}
              </div>
              {fingerprint.pathHits?.length > 0 && (
                <p className="font-mono mt-4 text-[11px] leading-relaxed text-ink-soft">
                  Paths: {fingerprint.pathHits.slice(0, 8).join(" · ")}
                  {fingerprint.pathHits.length > 8 ? "…" : ""}
                </p>
              )}
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Cohort trust", `${(census.meanTrust * 100).toFixed(0)}%`],
            ["Mean anger", `${(census.meanAnger * 100).toFixed(0)}%`],
            ["Low-trust minds", String(census.lowTrust)],
            ["Churn-ready", String(census.churnReady)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-[var(--hairline)] bg-white/50 px-4 py-3">
              <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft">{k}</p>
              <p className="font-display tele-line mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 shell">
          <div className="shell-inner p-4 sm:p-5">
            <WorldMeters world={town.world} />
          </div>
        </div>

        <div className="mt-8 shell">
          <TownMap districts={town.districts} live className="h-[420px] sm:h-[520px]" />
        </div>

        <section className="mt-16">
          <p className="eyebrow">Subjective minds</p>
          <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight">
            Not dice rolls — buyers and operators with reference points
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Each mind scores options with prospect theory (loss aversion λ), affect, and episodic
            memory, then picks via softmax. Angry, low-trust, high-arousal minds act first — then
            negotiate with the agent.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...actorMinds, ...buyerMinds].slice(0, 9).map((m) => (
              <MindCard key={m.id} mind={m} />
            ))}
          </div>
        </section>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight">Actors in town</h2>
            <ul className="mt-5 space-y-3">
              {town.actors.map((a) => (
                <li
                  key={a.id}
                  className="flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] pb-3"
                >
                  <div>
                    <p className="font-display font-medium">{a.name}</p>
                    <p className="text-sm text-ink-soft">{a.stance}</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    {a.kind}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight">Open pressure</h2>
            <ul className="mt-5 space-y-3">
              {town.tickets
                .filter((t) => t.open)
                .slice(0, 8)
                .map((t) => (
                  <li key={t.id} className="border-b border-[var(--hairline)] pb-3">
                    <p className="font-display text-[15px]">{t.subject}</p>
                    <p className="font-mono mt-1 text-[10px] uppercase tracking-wider text-signal">
                      {t.severity}
                    </p>
                  </li>
                ))}
            </ul>
            {town.incidents
              .filter((i) => i.active)
              .map((inc) => (
                <div
                  key={inc.id}
                  className="mt-6 rounded-2xl border border-[color-mix(in_oklab,var(--danger)_25%,transparent)] bg-[color-mix(in_oklab,var(--danger)_6%,white)] px-4 py-3"
                >
                  <p className="font-display text-sm font-semibold text-danger">Active incident</p>
                  <p className="mt-1 text-sm text-ink-soft">{inc.title}</p>
                </div>
              ))}
          </section>
        </div>

        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">Rehearsal history</h2>
            <p className="text-sm text-ink-soft">
              {runs.length} runs · {plans.length} plans
            </p>
          </div>
          {runs.length === 0 ? (
            <p className="mt-4 text-ink-soft">
              No rehearsals yet. Hit one-click billing rehearsal to open the war room.
            </p>
          ) : (
            <>
              <RunCompare runs={runs} />
              <ul className="mt-5 space-y-3">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/runs/${r.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--hairline)] bg-white/50 px-4 py-3 transition hover:bg-white/80"
                  >
                    <div>
                      <p className="font-display font-medium capitalize">{r.status}</p>
                      <p className="font-mono text-xs text-ink-soft">{r.id}</p>
                    </div>
                    <p className="font-display tele-line text-lg font-semibold">
                      {r.report ? `${(r.report.overall * 100).toFixed(0)}%` : "—"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            </>
          )}
        </section>

        <section className="mt-16">
          <h2 className="font-display text-xl font-semibold tracking-tight">Legacy bug contracts</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            These are baked into buyer reference points. Break them without an explicit migration
            path and loss-averse minds escalate.
          </p>
          <ul className="mt-5 columns-1 gap-x-8 sm:columns-2">
            {town.users
              .filter((u) => u.dependsOnBug)
              .slice(0, 12)
              .map((u) => (
                <li key={u.id} className="mb-3 break-inside-avoid border-b border-[var(--hairline)] pb-2">
                  <p className="font-display text-sm font-medium">{u.name}</p>
                  <p className="text-sm text-ink-soft">{u.dependsOnBug}</p>
                </li>
              ))}
          </ul>
        </section>
      </main>
    </>
  );
}
