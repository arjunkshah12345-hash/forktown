"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PixelTitleCanvas } from "@/components/retro/PixelTitleCanvas";
import { usePixelAudio } from "@/components/retro/usePixelAudio";

const TIPS = [
  "Subjective minds remember every broken coupon.",
  "Agents negotiate — they don't roll dice.",
  "Rehearse Invoice Barn before you ship Friday.",
  "Plant a repo. Grow a town. Survive the cutover.",
  "Press M for chiptune while you explore.",
];

export function HomeHub() {
  const [blink, setBlink] = useState(true);
  const [tip, setTip] = useState(0);
  const [entered, setEntered] = useState(false);
  const [fade, setFade] = useState(false);
  const [music, setMusic] = useState(false);
  const { blip } = usePixelAudio(music);

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
          <p className="pixel-title-eyebrow">★ WHERE AGENTS REHEARSE</p>
          <h1 className="pixel-title-logo">
            FORK
            <span className="pixel-title-logo-accent">TOWN</span>
          </h1>
          <p className="pixel-title-tag">
            Stardew energy for serious migrations · voxel towns · subjective minds
          </p>

          <div className="pixel-title-features">
            {["voxel barns", "buyer minds", "war room", "agent quests"].map((t) => (
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

        <p className="pixel-title-foot">chiptune · M · v1 farmtown</p>
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
          <Link href="/sample" className="pixel-btn pixel-btn-ghost">
            SAMPLE
          </Link>
          <Link href="/dashboard" className="pixel-btn pixel-btn-ghost">
            BOARD
          </Link>
        </div>
      </header>

      <main className="pixel-hub-main">
        <div className="pixel-hub-dialogue">
          <p className="font-pixel text-[0.42rem] uppercase tracking-widest text-[var(--px-gold)]">
            Town square
          </p>
          <h1 className="pixel-title-logo pixel-hub-logo">
            FORK
            <span className="pixel-title-logo-accent">TOWN</span>
          </h1>
          <p className="pixel-hub-copy">
            Plant a GitHub repo. Watch barns, canals, and villagers wake up. Let your agent rehearse
            the scary cutover inside a world that fights back.
          </p>

          <div className="pixel-hub-actions">
            <Link href="/connect" className="pixel-btn pixel-btn-primary" onClick={() => blip()}>
              ▶ PLANT YOUR REPO
            </Link>
            <Link href="/sample" className="pixel-btn pixel-btn-ghost" onClick={() => blip()}>
              PLAY SAMPLE TOWN
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
              t: "Found a town",
              d: "Fingerprint billing, auth, migrations — grow districts from the real tree.",
              href: "/connect",
            },
            {
              n: "02",
              t: "Walk the map",
              d: "Click barns, talk to angry buyers, feel trust and anger as HP bars.",
              href: "/sample",
            },
            {
              n: "03",
              t: "Rehearse cutover",
              d: "Agent enters. Town attacks. Survivability decides if you ship.",
              href: "/connect",
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
