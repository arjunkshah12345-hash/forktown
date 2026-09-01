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
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-5 pb-24 pt-28 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Municipal registry</p>
            <h1 className="font-display mt-4 text-[clamp(2.2rem,5vw,3.5rem)] font-semibold tracking-tight">
              Towns
            </h1>
            <p className="mt-3 max-w-xl text-lg text-ink-soft">
              Towns founded from real GitHub repos. Connect a codebase to generate a living simulation.
            </p>
          </div>
          <Link href="/connect" className="btn-island">
            Connect GitHub repo
            <span className="orb">↗</span>
          </Link>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {towns.length === 0 && (
              <p className="text-ink-soft">No towns yet. Connect a repository to found the first one.</p>
            )}
            {towns.map((t) => {
              const ext = t as typeof t & { source?: string; repoUrl?: string | null };
              return (
                <Link
                  key={t.id}
                  href={`/towns/${t.id}`}
                  className="group block rounded-[1.5rem] border border-[var(--hairline)] bg-white/55 px-5 py-5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-semibold tracking-tight group-hover:text-amber-deep">
                          {t.name}
                        </h2>
                        {ext.source && (
                          <span className="font-mono rounded-full bg-ink/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-soft">
                            {ext.source}
                          </span>
                        )}
                      </div>
                      <p className="font-mono mt-1 text-xs text-ink-soft">{t.codebase}</p>
                      <p className="mt-3 text-sm text-ink-soft">
                        {t.world.customers.toLocaleString()} customers · {t.districts.length} districts · seed{" "}
                        {t.seed}
                      </p>
                    </div>
                    <span className="font-display text-sm text-ink-soft">Enter ↗</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="shell h-fit">
            <div className="shell-inner p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold tracking-tight">Manual town</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Prefer GitHub connect for real fingerprints. Manual is for named experiments.
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
