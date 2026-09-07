"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PixelTitleCanvas } from "@/components/retro/PixelTitleCanvas";
import { usePixelAudio } from "@/components/retro/usePixelAudio";
import { withBase } from "@/lib/paths";

const TIPS = [
  "ft-mind-v2 + ft-agent-v2 — trained policies, not dice rolls.",
  "Ablate dual-write in the report — watch survivability fall.",
  "Press R in town to run the live rehearsal engine.",
  "Plant a real GitHub repo — the town grows from the file tree.",
  "Press M for chiptune while you explore.",
];

export function HomeHub() {
  const [blink, setBlink] = useState(true);
  const [tip, setTip] = useState(0);
  const [entered, setEntered] = useState(false);
  const [fade, setFade] = useState(false);
  const [music, setMusic] = useState(false);
  const [warm, setWarm] = useState(false);
  const { blip } = usePixelAudio(music);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("forktown-hub-entered");
      if (seen === "1") setEntered(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Warm the starter town so Enter is instant on serverless cold starts
  useEffect(() => {
    let cancelled = false;
    void fetch(withBase("/api/towns/starter"), { method: "POST" })
      .then((r) => r.ok)
      .then((ok) => {
        if (!cancelled && ok) setWarm(true);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 550);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        setMusic((m) => !m);
        return;
      }
      if (!entered && !fade) {
        setFade(true);
        setTimeout(() => {
          setEntered(true);
          setFade(false);
          try {
            localStorage.setItem("forktown-hub-entered", "1");
          } catch {
            /* ignore */
          }
        }, 420);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, fade]);

  const enter = () => {
    if (fade || entered) return;
    setFade(true);
    blip();
    setTimeout(() => {
      setEntered(true);
      setFade(false);
      try {
        localStorage.setItem("forktown-hub-entered", "1");
      } catch {
        /* ignore */
      }
    }, 420);
  };

  if (!entered) {
    return (
      <div
        className={`pixel-title-screen ${fade ? "pixel-title-fade" : ""}`}
        onClick={enter}
        role="button"
        tabIndex={0}
      >
        <div className="pixel-title-world pixel-title-world-bright">
          <PixelTitleCanvas />
          <div className="pixel-title-vignette" />
        </div>

        <div className="pixel-title-content">
          <p className="pixel-title-eyebrow">★ LIVE ENGINE · TRAINED POLICIES</p>
          <h1 className="pixel-title-logo">
            FORK
            <span className="pixel-title-logo-accent">TOWN</span>
          </h1>
          <p className="pixel-title-tag">
            SimCity for codebases — agents rehearse migrations in living voxel towns
          </p>

          <div className="pixel-title-features">
            {["ft-mind-v2", "ft-agent-v2", "war room", "counterfactuals"].map((t) => (
              <span key={t} className="pixel-title-chip">
                {t}
              </span>
            ))}
          </div>

          <p className="pixel-title-tip" key={tip}>
            {TIPS[tip]}
          </p>

          <p className={`pixel-title-cta ${blink ? "on" : ""}`}>▶ PRESS ANY KEY · CLICK TO ENTER</p>
        </div>

        <p className="pixel-title-foot">
          starter town · calibrated ladder · {warm ? "town warm" : "warming…"}
        </p>
      </div>
    );
  }

  return (
    <div className="pixel-hub">
      <div className="pixel-hub-sky">
        <div className="pixel-hub-world">
          <PixelTitleCanvas />
        </div>
        <div className="pixel-hub-fade" />
      </div>

      <header className="pixel-hub-top">
        <p className="font-pixel text-[0.55rem] text-[var(--px-gold)]">◆ FORKTOWN</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`pixel-btn ${music ? "pixel-btn-primary" : "pixel-btn-ghost"}`}
            onClick={() => setMusic((m) => !m)}
          >
            {music ? "♪ ON" : "♪ MUSIC"}
          </button>
          <Link href="/towns/acme-billing-town" className="pixel-btn pixel-btn-ghost">
            STARTER
          </Link>
          <Link href="/dashboard" className="pixel-btn pixel-btn-ghost">
            BOARD
          </Link>
        </div>
      </header>

      <main className="pixel-hub-main">
        <div className="pixel-hub-dialogue">
          <p className="font-pixel text-[0.42rem] uppercase tracking-widest text-[var(--px-gold)]">
            Town square · engine ready
          </p>
          <h1 className="pixel-title-logo pixel-hub-logo">
            FORK
            <span className="pixel-title-logo-accent">TOWN</span>
          </h1>
          <p className="pixel-hub-copy">
            Walk the starter town and press R — trained mind + agent nets rehearse the cutover. Open
            the report for counterfactual ablations that prove which mitigations were load-bearing.
          </p>

          <div className="pixel-hub-actions">
            <Link
              href="/towns/acme-billing-town"
              className="pixel-btn pixel-btn-primary"
              onClick={() => blip()}
            >
              ▶ ENTER STARTER TOWN
            </Link>
            <Link href="/connect" className="pixel-btn pixel-btn-ghost" onClick={() => blip()}>
              PLANT YOUR REPO
            </Link>
            <Link href="/towns" className="pixel-btn pixel-btn-ghost" onClick={() => blip()}>
              YOUR TOWNS
            </Link>
          </div>
        </div>

        <div className="pixel-hub-quests">
          <p className="font-pixel text-[0.45rem] text-[var(--px-gold)]">QUEST BOARD</p>
          {[
            {
              n: "01",
              t: "Rehearse Acme Billing",
              d: "Press R. Watch the war room. Read neural + counterfactuals.",
              href: "/towns/acme-billing-town",
            },
            {
              n: "02",
              t: "Plant a GitHub repo",
              d: "Fingerprint billing/auth/migrations — found a town from the tree.",
              href: "/connect",
            },
            {
              n: "03",
              t: "Ablate a mitigation",
              d: "Survival report shows Δ when dual-write or kill-switch is removed.",
              href: "/towns/acme-billing-town",
            },
          ].map((q) => (
            <Link key={q.n} href={q.href} className="pixel-hub-quest" onClick={() => blip()}>
              <span className="pixel-hub-quest-n">{q.n}</span>
              <span>
                <span className="pixel-hub-quest-t">{q.t}</span>
                <span className="pixel-hub-quest-d">{q.d}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>

      <section className="pixel-hub-crops">
        {[
          ["⌂", "Billing barn", "Checkout → invoices before revenue bleeds"],
          ["⛨", "Auth gate", "Sessions, IdPs, MFA with synthetic attackers"],
          ["▣", "Data silo", "Backfills, half-failed locks, old shapes"],
        ].map(([icon, title, body]) => (
          <article key={title} className="pixel-hub-crop">
            <p className="pixel-hub-crop-icon">{icon}</p>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <footer className="pixel-hub-foot">
        <p>Every serious codebase gets a town.</p>
        <p className="opacity-70">agents train in worlds — not just repos</p>
      </footer>
    </div>
  );
}
