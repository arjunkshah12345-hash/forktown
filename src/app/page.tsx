import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { HeroTown } from "@/components/HeroTown";

const wedges = [
  {
    title: "Billing migrations",
    body: "Checkout → invoices, coupon ghosts, tax edges, finance close — before prod revenue bleeds.",
  },
  {
    title: "Auth migrations",
    body: "Sessions, IdPs, MFA cutovers with synthetic attackers and legacy login quirks.",
  },
  {
    title: "Database migrations",
    body: "Online backfills, half-failed locks, read-repair, and customers who depend on old shapes.",
  },
];

const layers = [
  "Synthetic users",
  "Subjective buyer minds",
  "Traffic & retries",
  "Support tickets",
  "Incidents & SRE",
  "Billing states",
  "API outages",
  "Legacy bug contracts",
  "PM scope churn",
  "Security attackers",
  "Reviewer personalities",
  "Agent negotiations",
];

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="relative z-[2] flex-1">
        {/* Hero — brand first, one headline, one sentence, CTAs, full-bleed map */}
        <section className="relative min-h-[100dvh] overflow-hidden pt-28">
          <div className="absolute inset-0">
            <HeroTown />
          </div>
          <div className="relative mx-auto flex min-h-[calc(100dvh-7rem)] max-w-6xl flex-col justify-end px-5 pb-16 sm:px-8 sm:pb-20">
            <div className="max-w-2xl rounded-[2rem] border border-[var(--hairline)] bg-[color-mix(in_oklab,white_72%,transparent)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-8">
              <p className="eyebrow">
                <span className="beacon" />
                Codebase simulator
              </p>
              <h1 className="font-display mt-5 text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-ink">
                Forktown
              </h1>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft sm:text-xl">
                Where agents rehearse before they ship.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/connect" className="btn-island">
                  Connect your GitHub repo
                  <span className="orb">↗</span>
                </Link>
                <Link href="/dashboard" className="btn-ghost">
                  Dashboard
                </Link>
                <Link href="/towns" className="btn-ghost">
                  Your towns
                </Link>
                <Link href="/sample" className="btn-ghost">
                  Retro sample 🎮
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
          <p className="eyebrow">The shallow path is not enough</p>
          <h2 className="font-display mt-5 max-w-3xl text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight text-ink">
            Issue → repo → PR → tests is theater. Real software lives in a world.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Users behave weirdly. APIs go down. Migrations fail halfway. Old customers depend on bugs.
            Forktown wraps your codebase in that world so an agent can prove a change survives —
            not just that green checks stay green.
          </p>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Found a town",
                d: "We synthesize districts, customers, tickets, incidents, and actors around your repo.",
              },
              {
                n: "02",
                t: "Agent enters",
                d: "Your coding agent rehearses the migration inside the simulation — dual-writes, flags, rollbacks.",
              },
              {
                n: "03",
                t: "Town attacks",
                d: "Eight pressure layers hit the change. Survivability decides if you trust the PR.",
              },
            ].map((s) => (
              <div key={s.n}>
                <p className="font-mono text-sm text-amber">{s.n}</p>
                <h3 className="font-display mt-2 text-2xl font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--hairline)] bg-[color-mix(in_oklab,white_45%,transparent)] py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <p className="eyebrow">Wedge</p>
            <h2 className="font-display mt-5 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold tracking-tight">
              Agent-safe migrations first
            </h2>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              Valuable, scary, and currently hard for agents. Rehearse before prod.
            </p>
            <div className="mt-14 grid gap-12 md:grid-cols-3">
              {wedges.map((w) => (
                <article key={w.title}>
                  <h3 className="font-display text-xl font-semibold tracking-tight">{w.title}</h3>
                  <p className="mt-3 leading-relaxed text-ink-soft">{w.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
          <div className="grid items-end gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="eyebrow">What the town generates</p>
              <h2 className="font-display mt-5 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold tracking-tight">
                Not another coding agent. A world that fights back.
              </h2>
            </div>
            <ul className="columns-1 gap-x-10 sm:columns-2">
              {layers.map((l) => (
                <li
                  key={l}
                  className="mb-3 break-inside-avoid border-b border-[var(--hairline)] pb-3 font-display text-lg tracking-tight text-ink"
                >
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
          <div className="grid items-end gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="eyebrow">Subjective minds</p>
              <h2 className="font-display mt-5 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold tracking-tight">
                Buyers don’t roll dice. They weigh losses.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                Every synthetic person has loss aversion, status-quo bias, trust, anger, and memory.
                They score options with prospect theory, then negotiate with your agent. Survive
                their utilities — not a random chaos monkey.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                ["Prospect theory λ", "Losses loom larger than gains against each mind’s reference bill."],
                ["Affect + memory", "Anger and old tickets tint every choice; loyalty can still hold."],
                ["Negotiation", "Agent mitigations update trust — or fail to. Softmax under arousal still misfires."],
              ].map(([t, d]) => (
                <li key={t} className="border-b border-[var(--hairline)] pb-4">
                  <p className="font-display text-lg font-semibold tracking-tight">{t}</p>
                  <p className="mt-1 text-ink-soft">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-32 sm:px-8">
          <div className="shell">
            <div className="shell-inner relative overflow-hidden px-6 py-14 sm:px-12 sm:py-16">
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40"
                style={{
                  background: "radial-gradient(circle, color-mix(in oklab, var(--amber) 50%, transparent), transparent 70%)",
                }}
              />
              <p className="eyebrow">Big vision</p>
              <h2 className="font-display mt-5 max-w-2xl text-[clamp(1.9rem,4vw,3.25rem)] font-semibold leading-[1.05] tracking-tight">
                Every serious codebase gets a town. Agents don’t just code in repos — they train in worlds.
              </h2>
              <div className="mt-10">
                <Link href="/connect" className="btn-island">
                  Found a town from your repo
                  <span className="orb">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-[2] border-t border-[var(--hairline)] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-sm font-semibold tracking-tight">Forktown</p>
          <p className="text-sm text-ink-soft">where agents rehearse before they ship</p>
        </div>
      </footer>
    </>
  );
}
