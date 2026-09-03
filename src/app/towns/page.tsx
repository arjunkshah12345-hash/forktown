import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { CreateTownForm } from "@/components/CreateTownForm";
import { listTowns } from "@/lib/sim/store";

export const dynamic = "force-dynamic";

export default async function TownsPage() {
  const towns = await listTowns();

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-8">
        <div className="px-panel flex flex-wrap items-end justify-between gap-6 p-5 sm:p-8">
          <div>
            <p className="eyebrow">Town registry</p>
            <h1 className="px-title mt-4 !text-[clamp(0.75rem,2.5vw,1.05rem)]">TOWNS</h1>
            <p className="px-body mt-3 max-w-xl px-muted">
              Towns founded from real GitHub repos. Plant a codebase to grow a living simulation.
            </p>
          </div>
          <Link href="/connect" className="btn-island">
            Plant GitHub repo
            <span className="orb">↗</span>
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {towns.length === 0 && (
              <p className="px-panel p-5 px-body px-muted">
                No towns yet. Plant a repository to found the first one.
              </p>
            )}
            {towns.map((t) => {
              const ext = t as typeof t & { source?: string; repoUrl?: string | null };
              return (
                <Link key={t.id} href={`/towns/${t.id}`} className="group block px-panel p-5 hover:border-[var(--border-hi)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-pixel text-[0.55rem] leading-relaxed text-[var(--paper)] group-hover:text-[var(--amber)]">
                          {t.name}
                        </h2>
                        {ext.source && <span className="px-chip">{ext.source}</span>}
                      </div>
                      <p className="px-body mt-2 text-[1rem] px-muted">{t.codebase}</p>
                      <p className="px-body mt-2 text-[1rem] px-muted">
                        {t.world.customers.toLocaleString()} villagers · {t.districts.length} districts ·
                        seed {t.seed}
                      </p>
                    </div>
                    <span className="font-pixel text-[0.4rem] text-[var(--amber)]">Enter ↗</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="shell h-fit">
            <div className="shell-inner p-5 sm:p-8">
              <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Manual town</h2>
              <p className="px-body mt-2 text-[1.05rem] px-muted">
                Prefer GitHub plant for real fingerprints. Manual is for named experiments.
              </p>
              <div className="mt-6">
                <CreateTownForm />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
