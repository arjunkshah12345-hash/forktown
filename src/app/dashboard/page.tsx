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
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-5 pb-28 pt-28 sm:px-8">
        <p className="eyebrow">
          <span className="beacon" />
          Command
        </p>
        <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-3 max-w-xl text-lg text-ink-soft">
          Real towns from real repos. Rehearsals, survivability, and subjective pressure at a glance.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-4">
          {[
            ["Towns", String(towns.length)],
            ["Recent runs", String(recent.length)],
            ["Survived", recent.length ? `${Math.round((survived / recent.length) * 100)}%` : "—"],
            ["Avg survivability", avg != null ? `${(avg * 100).toFixed(0)}%` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-[var(--hairline)] bg-white/55 px-4 py-4">
              <p className="font-display text-[10px] uppercase tracking-wider text-ink-soft">{k}</p>
              <p className="font-display tele-line mt-1 text-3xl font-semibold">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-semibold tracking-tight">Recent rehearsals</h2>
              <Link href="/towns" className="font-display text-sm text-ink-soft hover:text-ink">
                All towns ↗
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-4 text-ink-soft">
                No runs yet.{" "}
                <Link href="/connect" className="text-ink underline">
                  Connect a repo
                </Link>{" "}
                and rehearse.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {recent.map(({ run, townName }) => (
                  <li key={run.id}>
                    <Link
                      href={`/runs/${run.id}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--hairline)] bg-white/50 px-4 py-3 transition hover:bg-white/80"
                    >
                      <div>
                        <p className="font-display font-medium capitalize">{run.status}</p>
                        <p className="text-sm text-ink-soft">
                          {townName} · {new Date(run.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-display tele-line text-lg font-semibold">
                        {run.report ? `${(run.report.overall * 100).toFixed(0)}%` : "—"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight">Your towns</h2>
            <ul className="mt-5 space-y-3">
              {towns.slice(0, 8).map((t) => {
                const ext = t as typeof t & { source?: string };
                return (
                  <li key={t.id}>
                    <Link
                      href={`/towns/${t.id}`}
                      className="block rounded-2xl border border-[var(--hairline)] bg-white/50 px-4 py-3 transition hover:bg-white/80"
                    >
                      <p className="font-display font-medium">{t.name}</p>
                      <p className="font-mono mt-0.5 text-xs text-ink-soft">
                        {ext.source ?? "manual"} · {t.world.customers.toLocaleString()} customers
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/connect" className="btn-island">
                Connect repo
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
