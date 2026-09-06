import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { LiveTownWorld } from "@/components/LiveTownWorld";
import { WorldMeters } from "@/components/WorldMeters";
import { MindCard } from "@/components/MindCard";
import { TownTicker } from "@/components/TownTicker";
import { ResyncButton } from "@/components/ResyncButton";
import { RunCompare } from "@/components/RunCompare";
import { allPlaybooks, primaryPlaybook } from "@/lib/github/playbook";
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
  const playbooks = allPlaybooks(fingerprint);
  const playbook = primaryPlaybook(fingerprint);

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-[1400px] flex-1 px-3 pb-16 pt-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-panel p-4">
          <div>
            <p className="eyebrow">
              <span className="beacon" />
              Live town
            </p>
            <h1 className="px-title mt-3 !text-[clamp(0.65rem,2vw,0.95rem)]">{town.name}</h1>
            <p className="px-body mt-1 text-[1.05rem] px-muted">{town.codebase}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/towns/${town.id}/rehearse`} className="btn-ghost">
              Custom quest
            </Link>
            {canResync && <ResyncButton townId={town.id} />}
            {repoUrl && (
              <a href={repoUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                GitHub
              </a>
            )}
          </div>
        </div>

        <TownTicker />

        <div className="mt-3">
          <LiveTownWorld
            townId={town.id}
            districts={town.districts}
            actors={town.actors}
            users={town.users}
            minds={allMinds}
            townName={town.name}
            playbooks={playbooks.length ? playbooks : [playbook]}
            world={town.world}
            priorRuns={runs.length}
          />
        </div>

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

        <div className="mt-3 shell">
          <div className="shell-inner p-4">
            <WorldMeters world={town.world} />
          </div>
        </div>

        {fingerprint && (
          <section className="mt-3 px-panel p-5">
            <p className="font-pixel text-[0.4rem] uppercase text-[#bcaaa4]">Repo fingerprint</p>
            <h2 className="font-pixel mt-2 text-[0.55rem] text-[var(--amber)]">{fingerprint.fullName}</h2>
            <p className="px-body mt-1 text-[1rem] px-muted">
              {fingerprint.filesSampled} files · ★ {fingerprint.stars} · {fingerprint.defaultBranch}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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

        <section className="mt-4 px-panel p-5">
          <p className="eyebrow">Subjective minds</p>
          <h2 className="font-pixel mt-3 text-[0.55rem] text-[var(--paper)]">
            Buyers with reference points
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allMinds.slice(0, 9).map((m) => (
              <MindCard key={m.id} mind={m} />
            ))}
          </div>
        </section>

        <section className="mt-4 px-panel p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Rehearsal history</h2>
            <p className="font-pixel text-[0.38rem] text-[#bcaaa4]">
              {runs.length} runs · {plans.length} plans
            </p>
          </div>
          {runs.length === 0 ? (
            <p className="px-body mt-4 px-muted">No rehearsals yet — press R in the town above.</p>
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
      </main>
    </>
  );
}
