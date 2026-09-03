import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { HeroTown } from "@/components/HeroTown";

const wedges = [
  {
    title: "Billing barn",
    body: "Checkout → invoices, coupon ghosts, tax edges — rehearse before revenue bleeds.",
    tile: "⌂",
  },
  {
    title: "Auth gate",
    body: "Sessions, IdPs, MFA cutovers with synthetic attackers and legacy login quirks.",
    tile: "⛨",
  },
  {
    title: "Data silo",
    body: "Online backfills, half-failed locks, and customers who still need the old shape.",
    tile: "▣",
  },
];

const layers = [
  "Synthetic villagers",
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
        <section className="relative min-h-[100dvh] overflow-hidden">
          <HeroTown />
          <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:px-8 sm:pb-14">
            <div className="px-dialogue max-w-xl">
              <p className="font-pixel text-[0.45rem] uppercase tracking-widest text-[var(--amber)]">
                ★ A living town for your codebase
              </p>
              <h1 className="px-title mt-4">FORKTOWN</h1>
              <p className="px-body mt-4 max-w-md text-[#fff8e7]">
                Plant a repo. Watch villagers, barns, and canals wake up. Let agents rehearse the
                scary migration — Stardew vibes, serious stakes.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/connect" className="btn-island">
                  Plant your GitHub repo
                  <span className="orb">↗</span>
                </Link>
                <Link href="/sample" className="btn-ghost">
                  Play the sample town
                </Link>
                <Link href="/dashboard" className="btn-ghost">
                  Board
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <div className="px-panel p-5 sm:p-8">
            <p className="eyebrow">Quest log</p>
            <h2 className="px-title mt-5 max-w-3xl !text-[clamp(0.7rem,2vw,0.95rem)] !text-[var(--paper)]">
              Green checks are theater. Real software lives in a world.
            </h2>
            <p className="px-body mt-5 max-w-2xl px-muted">
              Users behave weirdly. APIs go down. Migrations fail halfway. Old customers depend on
              bugs. Forktown wraps your codebase in that world so an agent can prove a change
              survives — not just that CI stayed green.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "Found a town",
                  d: "We grow districts, villagers, tickets, and incidents around your repo.",
                },
                {
                  n: "02",
                  t: "Agent enters",
                  d: "Your coding agent rehearses the cutover — dual-writes, flags, rollbacks.",
                },
                {
                  n: "03",
                  t: "Town attacks",
                  d: "Pressure layers hit the change. Survivability decides if you ship.",
                },
              ].map((s) => (
                <div key={s.n} className="px-panel-hi p-4">
                  <p className="font-pixel text-[0.45rem] text-[var(--amber)]">{s.n}</p>
                  <h3 className="font-pixel mt-3 text-[0.55rem] leading-relaxed text-[var(--paper)]">
                    {s.t}
                  </h3>
                  <p className="px-body mt-3 text-[1.05rem] px-muted">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          <div className="px-panel p-5 sm:p-8">
            <p className="eyebrow">Crop rotation</p>
            <h2 className="px-title mt-5 !text-[clamp(0.65rem,2vw,0.9rem)] !text-[var(--paper)]">
              Agent-safe migrations first
            </h2>
            <p className="px-body mt-4 max-w-xl px-muted">
              Valuable, scary, and currently hard for agents. Rehearse before prod.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {wedges.map((w) => (
                <article key={w.title} className="px-panel-hi p-4">
                  <p className="font-pixel text-[1rem] text-[var(--amber)]" aria-hidden>
                    {w.tile}
                  </p>
                  <h3 className="font-pixel mt-3 text-[0.55rem] leading-relaxed">{w.title}</h3>
                  <p className="px-body mt-3 text-[1.05rem] px-muted">{w.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="px-panel p-5 sm:p-8">
              <p className="eyebrow">What the town grows</p>
              <h2 className="px-title mt-5 !text-[clamp(0.65rem,2vw,0.9rem)] !text-[var(--paper)]">
                Not another coding agent. A world that fights back.
              </h2>
            </div>
            <ul className="px-panel grid gap-0 p-2 sm:grid-cols-2">
              {layers.map((l) => (
                <li key={l} className="px-list-row px-3 font-pixel text-[0.45rem] leading-relaxed text-[var(--paper)]">
                  ▸ {l}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="px-panel p-5 sm:p-8">
              <p className="eyebrow">Villager minds</p>
              <h2 className="px-title mt-5 !text-[clamp(0.65rem,2vw,0.9rem)] !text-[var(--paper)]">
                Buyers don’t roll dice. They weigh losses.
              </h2>
              <p className="px-body mt-4 px-muted">
                Every synthetic person has loss aversion, status-quo bias, trust, anger, and memory.
                Survive their utilities — not a random chaos monkey.
              </p>
            </div>
            <ul className="px-panel space-y-0 p-4">
              {[
                ["Prospect theory λ", "Losses loom larger than gains against each mind’s reference bill."],
                ["Affect + memory", "Anger and old tickets tint every choice; loyalty can still hold."],
                ["Negotiation", "Agent mitigations update trust — or fail to."],
              ].map(([t, d]) => (
                <li key={t} className="px-list-row">
                  <p className="font-pixel text-[0.5rem] text-[var(--amber)]">{t}</p>
                  <p className="px-body mt-2 text-[1.05rem] px-muted">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
          <div className="shell">
            <div className="shell-inner relative overflow-hidden px-5 py-10 sm:px-10 sm:py-12">
              <p className="eyebrow">Big vision</p>
              <h2 className="px-title mt-5 max-w-2xl !text-[clamp(0.7rem,2.2vw,1rem)]">
                Every serious codebase gets a town. Agents don’t just code in repos — they train in
                worlds.
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/connect" className="btn-island">
                  Found a town from your repo
                  <span className="orb">↗</span>
                </Link>
                <Link href="/sample" className="btn-ghost">
                  Enter sample world
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-[2] border-t-4 border-[var(--border)] bg-[var(--soil)] px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-pixel text-[0.5rem] text-[var(--amber)]">◆ FORKTOWN</p>
          <p className="font-pixel text-[0.4rem] text-[#bcaaa4]">
            where agents rehearse before they ship
          </p>
        </div>
      </footer>
    </>
  );
}
