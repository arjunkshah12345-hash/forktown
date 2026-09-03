import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { LiveTownWorld } from "@/components/LiveTownWorld";
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
  const allMinds = [...actorMinds, ...buyerMinds];
  const census = cohortStats(hydrateMinds(town.users, town.actors, town.seed));
  const fingerprint = town.fingerprint;
  const repoUrl = town.repoUrl;
  const canResync = Boolean(fingerprint?.localPath || repoUrl);
  const playbook = primaryPlaybook(fingerprint);

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-8">
        <div className="px-panel flex flex-wrap items-end justify-between gap-6 p-5 sm:p-6">
          <div>
            <p className="eyebrow">
              <span className="beacon" />
              Live town
            </p>
            <h1 className="px-title mt-4 !text-[clamp(0.7rem,2.4vw,1.05rem)]">{town.name}</h1>
            <p className="px-body mt-2 text-[1.05rem] px-muted">{town.codebase}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickRehearse townId={town.id} playbook={playbook} />
            <Link href={`/towns/${town.id}/rehearse`} className="btn-ghost">
              Custom quest
            </Link>
            {canResync && <ResyncButton townId={town.id} />}
          </div>
        </div>

        <div className="mt-4">
          <TownTicker />
        </div>

        <div className="mt-4">
          <LiveTownWorld
            townId={town.id}
            districts={town.districts}
            actors={town.actors}
            users={town.users}
            minds={allMinds}
            townName={town.name}
            playbook={playbook}
          />
        </div>

        {fingerprint && (
          <section className="mt-4 px-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-pixel text-[0.4rem] uppercase text-[#bcaaa4]">Repo fingerprint</p>
                <h2 className="font-pixel mt-2 text-[0.55rem] leading-relaxed text-[var(--amber)]">
                  {fingerprint.fullName}
                </h2>
                <p className="px-body mt-1 text-[1rem] px-muted">
                  {fingerprint.filesSampled} files · ★ {fingerprint.stars} · branch{" "}
                  {fingerprint.defaultBranch}
                </p>
              </div>
              {repoUrl && (
                <a href={repoUrl} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
                  Open on GitHub
                </a>
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
                  <span key={String(t)} className="px-chip">
                    {t}
                  </span>
                ))}
            </div>
          </section>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {[
            ["Cohort trust", `${(census.meanTrust * 100).toFixed(0)}%`],
            ["Mean anger", `${(census.meanAnger * 100).toFixed(0)}%`],
            ["Low-trust minds", String(census.lowTrust)],
            ["Churn-ready", String(census.churnReady)],
          ].map(([k, v]) => (
            <div key={k} className="px-stat">
              <p className="k">{k}</p>
              <p className="v">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 shell">
          <div className="shell-inner p-4 sm:p-5">
            <WorldMeters world={town.world} />
          </div>
        </div>

        <section className="mt-6 px-panel p-5">
          <p className="eyebrow">Subjective minds</p>
          <h2 className="font-pixel mt-3 text-[0.6rem] leading-relaxed text-[var(--paper)]">
            Not dice rolls — buyers with reference points
          </h2>
          <p className="px-body mt-2 max-w-2xl px-muted">
            Each mind scores options with prospect theory, affect, and memory — then negotiates with
            your agent.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allMinds.slice(0, 9).map((m) => (
              <MindCard key={m.id} mind={m} />
            ))}
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="px-panel p-5">
            <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Actors in town</h2>
            <ul className="mt-4">
              {town.actors.map((a) => (
                <li key={a.id} className="px-list-row flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-pixel text-[0.48rem] text-[var(--paper)]">{a.name}</p>
                    <p className="px-body mt-1 text-[1rem] px-muted">{a.stance}</p>
                  </div>
                  <span className="px-chip">{a.kind}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="px-panel p-5">
            <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Open pressure</h2>
            <ul className="mt-4">
              {town.tickets
                .filter((t) => t.open)
                .slice(0, 8)
                .map((t) => (
                  <li key={t.id} className="px-list-row">
                    <p className="font-pixel text-[0.45rem] leading-relaxed text-[var(--paper)]">
                      {t.subject}
                    </p>
                    <p className="mt-1 font-pixel text-[0.35rem] uppercase text-[var(--signal)]">
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
                  className="mt-4 border-4 border-[var(--danger)] bg-[#3e1a16] px-3 py-3"
                >
                  <p className="font-pixel text-[0.42rem] text-[var(--danger)]">Active incident</p>
                  <p className="px-body mt-1 text-[1.05rem]">{inc.title}</p>
                </div>
              ))}
          </section>
        </div>

        <section className="mt-4 px-panel p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Rehearsal history</h2>
            <p className="font-pixel text-[0.38rem] text-[#bcaaa4]">
              {runs.length} runs · {plans.length} plans
            </p>
          </div>
          {runs.length === 0 ? (
            <p className="px-body mt-4 px-muted">
              No rehearsals yet. Hit one-click billing rehearsal to open the war room.
            </p>
          ) : (
            <>
              <RunCompare runs={runs} />
              <ul className="mt-4">
                {runs.map((r) => (
                  <li key={r.id} className="px-list-row">
                    <Link href={`/runs/${r.id}`} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-pixel text-[0.48rem] capitalize text-[var(--paper)]">
                          {r.status}
                        </p>
                        <p className="px-body mt-1 text-[0.95rem] px-muted">{r.id}</p>
                      </div>
                      <p className="font-pixel text-[0.65rem] text-[var(--amber)]">
                        {r.report ? `${(r.report.overall * 100).toFixed(0)}%` : "—"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="mt-4 px-panel p-5">
          <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Legacy bug contracts</h2>
          <p className="px-body mt-2 max-w-xl text-[1.05rem] px-muted">
            Baked into buyer reference points. Break them without a migration path and loss-averse
            minds escalate.
          </p>
          <ul className="mt-4 columns-1 gap-x-8 sm:columns-2">
            {town.users
              .filter((u) => u.dependsOnBug)
              .slice(0, 12)
              .map((u) => (
                <li key={u.id} className="mb-3 break-inside-avoid border-b-2 border-[var(--border)] pb-2">
                  <p className="font-pixel text-[0.45rem] text-[var(--paper)]">{u.name}</p>
                  <p className="px-body mt-1 text-[1rem] px-muted">{u.dependsOnBug}</p>
                </li>
              ))}
          </ul>
        </section>
      </main>
    </>
  );
}
