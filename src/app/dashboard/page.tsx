import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { listRecentRuns, listTowns } from "@/lib/sim/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const towns = await listTowns();
  const recent = await listRecentRuns(15);
  const survived = recent.filter((r) => r.run.status === "survived").length;
  const avg =
    recent.length && recent.every((r) => r.run.report)
      ? recent.reduce((s, r) => s + (r.run.report?.overall ?? 0), 0) / recent.length
      : null;

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-8">
        <div className="px-panel p-5 sm:p-8">
          <p className="eyebrow">
            <span className="beacon" />
            Town board
          </p>
          <h1 className="px-title mt-4 !text-[clamp(0.75rem,2.5vw,1.05rem)]">DASHBOARD</h1>
          <p className="px-body mt-3 max-w-xl px-muted">
            Real towns from real repos. Rehearsals, survivability, and subjective pressure at a glance.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {[
              ["Towns", String(towns.length)],
              ["Recent runs", String(recent.length)],
              ["Survived", recent.length ? `${Math.round((survived / recent.length) * 100)}%` : "—"],
              ["Avg survive", avg != null ? `${(avg * 100).toFixed(0)}%` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="px-stat">
                <p className="k">{k}</p>
                <p className="v">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="px-panel p-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Recent rehearsals</h2>
              <Link href="/towns" className="font-pixel text-[0.4rem] text-[#bcaaa4] hover:text-[var(--amber)]">
                All towns ↗
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-body mt-4 px-muted">
                No runs yet.{" "}
                <Link href="/connect" className="text-[var(--amber)] underline">
                  Plant a repo
                </Link>{" "}
                and rehearse.
              </p>
            ) : (
              <ul className="mt-4">
                {recent.map(({ run, townName }) => (
                  <li key={run.id} className="px-list-row">
                    <Link href={`/runs/${run.id}`} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-pixel text-[0.5rem] capitalize text-[var(--paper)]">{run.status}</p>
                        <p className="px-body mt-1 text-[1rem] px-muted">
                          {townName} · {new Date(run.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-pixel text-[0.65rem] text-[var(--amber)]">
                        {run.report ? `${(run.report.overall * 100).toFixed(0)}%` : "—"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="px-panel p-5">
            <h2 className="font-pixel text-[0.55rem] text-[var(--amber)]">Your towns</h2>
            <ul className="mt-4">
              {towns.slice(0, 8).map((t) => {
                const ext = t as typeof t & { source?: string };
                return (
                  <li key={t.id} className="px-list-row">
                    <Link href={`/towns/${t.id}`} className="block">
                      <p className="font-pixel text-[0.5rem] text-[var(--paper)]">{t.name}</p>
                      <p className="px-body mt-1 text-[1rem] px-muted">
                        {ext.source ?? "manual"} · {t.world.customers.toLocaleString()} villagers
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/connect" className="btn-island">
                Plant repo
                <span className="orb">↗</span>
              </Link>
              <Link href="/settings/keys" className="btn-ghost">
                Agent keys
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
