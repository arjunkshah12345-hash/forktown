"use client";

import { useEffect, useState } from "react";
import { PixelTitleCanvas } from "./PixelTitleCanvas";
import { loadSampleSave } from "./sample-save";

const TIPS = [
  "Subjective minds remember every broken coupon.",
  "Agents negotiate — they don't roll dice.",
  "Rehearse Invoice Barn before you ship Friday.",
  "Press M for chiptune. Press P to pause.",
];

export function PixelTitleScreen({
  onStart,
}: {
  onStart: (opts?: { continueSave?: boolean }) => void;
}) {
  const [blink, setBlink] = useState(true);
  const [fade, setFade] = useState(false);
  const [tip, setTip] = useState(0);
  const [hasSave, setHasSave] = useState(false);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const s = loadSampleSave();
    if (s?.visited) {
      setHasSave(true);
      setLevel(s.level);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const go = (continueSave: boolean) => {
    if (fade) return;
    setFade(true);
    setTimeout(() => onStart({ continueSave }), 420);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "c" || e.key === "C") {
        if (hasSave) go(true);
        else go(false);
        return;
      }
      if (e.key === "n" || e.key === "N") {
        go(false);
        return;
      }
      go(hasSave);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSave, fade]);

  return (
    <div className={`pixel-title-screen ${fade ? "pixel-title-fade" : ""}`}>
      <div className="pixel-title-world">
        <PixelTitleCanvas />
        <div className="pixel-title-vignette" />
      </div>

      <div className="pixel-title-content">
        <p className="pixel-title-eyebrow">WHERE AGENTS REHEARSE</p>
        <h1 className="pixel-title-logo">
          FORK
          <span className="pixel-title-logo-accent">TOWN</span>
        </h1>
        <p className="pixel-title-tag">
          SimCity for codebases · subjective minds · agent-safe migrations
        </p>

        <div className="pixel-title-features">
          {["12 districts", "85 minds", "54 talks"].map((t) => (
            <span key={t} className="pixel-title-chip">
              {t}
            </span>
          ))}
        </div>

        <p className="pixel-title-tip" key={tip}>
          {TIPS[tip]}
        </p>

        <div className="pixel-title-actions">
          {hasSave && (
            <button type="button" className="pixel-btn pixel-btn-primary" onClick={() => go(true)}>
              ▶ CONTINUE · LV {level}
            </button>
          )}
          <button
            type="button"
            className={`pixel-btn ${hasSave ? "pixel-btn-ghost" : "pixel-btn-primary"}`}
            onClick={() => go(false)}
          >
            {hasSave ? "NEW GAME" : "▶ PRESS START"}
          </button>
        </div>

        <p className={`pixel-title-cta ${blink ? "on" : ""}`}>
          {hasSave ? "C continue · N new · any key" : "▶ PRESS ANY KEY TO ENTER"}
        </p>
      </div>

      <p className="pixel-title-foot">concept UI · save slot local · v0.7</p>
    </div>
  );
}
