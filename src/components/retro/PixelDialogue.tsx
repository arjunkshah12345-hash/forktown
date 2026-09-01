"use client";

import { useCallback, useEffect, useState } from "react";
import { PixelPortrait } from "./PixelPortrait";
import { PixelWarMap } from "./PixelWarMap";
import type { SampleDistrict } from "./sample-data";

export function PixelDialogue({
  lines,
  onAdvance,
  focusSpeaker,
  focusNonce = 0,
  onChoice,
}: {
  lines: { speaker: string; portrait: string; text: string }[];
  onAdvance?: () => void;
  focusSpeaker?: string | null;
  focusNonce?: number;
  onChoice?: (choice: "mitigate" | "escalate") => void;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState(false);
  const [chose, setChose] = useState(false);
  const line = lines[index];
  const showChoices = done && line.speaker === "Mara K." && !chose && !!onChoice;

  useEffect(() => {
    if (!focusSpeaker) return;
    const i = lines.findIndex((l) => l.speaker === focusSpeaker);
    if (i >= 0) {
      setIndex(i);
      setChose(false);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [focusSpeaker, focusNonce, lines]);

  useEffect(() => {
    setShown("");
    setDone(false);
    setChose(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(line.text.slice(0, i));
      if (i >= line.text.length) {
        setDone(true);
        clearInterval(id);
      }
    }, 14);
    return () => clearInterval(id);
  }, [line.text, index]);

  const advance = useCallback(() => {
    if (!done) {
      setShown(line.text);
      setDone(true);
      return;
    }
    if (showChoices) return;
    setIndex((v) => (v + 1) % lines.length);
    onAdvance?.();
  }, [done, line.text, lines.length, onAdvance, showChoices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showChoices) {
        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          setChose(true);
          onChoice?.("mitigate");
          setIndex((v) => (v + 1) % lines.length);
          return;
        }
        if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          setChose(true);
          onChoice?.("escalate");
          setIndex((v) => (v + 1) % lines.length);
          return;
        }
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, showChoices, onChoice, lines.length]);

  return (
    <div className={`pixel-dialogue ${flash ? "pixel-dialogue-flash" : ""}`}>
      <button type="button" className="pixel-dialogue-click pixel-dialogue-main" onClick={advance}>
        <div className="pixel-dialogue-portrait">
          <PixelPortrait type={line.portrait} />
        </div>
        <div className="pixel-dialogue-body">
          <p className="pixel-dialogue-speaker">{line.speaker}</p>
          <p className="pixel-dialogue-text">
            {shown}
            {!done && <span className="pixel-cursor">▌</span>}
          </p>
          <div className="pixel-dialogue-footer">
            <div className="pixel-dialogue-dots">
              {lines.map((_, i) => (
                <span key={i} className={i === index ? "active" : ""} />
              ))}
            </div>
            <span className="pixel-dialogue-hint">
              {showChoices ? "CHOOSE" : done ? "▼ NEXT" : "▼ SKIP"}
            </span>
          </div>
        </div>
      </button>
      {showChoices && (
        <div className="pixel-dialogue-choices">
          <button
            type="button"
            className="pixel-btn pixel-btn-primary"
            onClick={() => {
              setChose(true);
              onChoice?.("mitigate");
              setIndex((v) => (v + 1) % lines.length);
            }}
          >
            A · OFFER DUAL-WRITE
          </button>
          <button
            type="button"
            className="pixel-btn pixel-btn-ghost"
            onClick={() => {
              setChose(true);
              onChoice?.("escalate");
              setIndex((v) => (v + 1) % lines.length);
            }}
          >
            B · PUSH CUTOVER
          </button>
        </div>
      )}
    </div>
  );
}

function TrustGraph({ values }: { values: number[] }) {
  const [el, setEl] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.strokeStyle = "#66BB6A";
    ctx.lineWidth = 1;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 2 + (i / (values.length - 1)) * (el.width - 4);
      const y = el.height - 2 - (v / 100) * (el.height - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [values, el]);
  return <canvas ref={setEl} width={200} height={52} className="pixel-trust-graph" />;
}

export function PixelWarRoom({
  open,
  onClose,
  trustHistory,
  log,
  districts,
  selectedId,
  pulseId,
}: {
  open: boolean;
  onClose: () => void;
  trustHistory: number[];
  log: string[];
  districts?: SampleDistrict[];
  selectedId?: string | null;
  pulseId?: string | null;
}) {
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setScroll((s) => s + 1), 40);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  return (
    <div className="pixel-overlay" role="dialog" aria-modal>
      <div className="pixel-modal pixel-war-room">
        <header className="pixel-modal-head">
          <h2>⚔ WAR ROOM</h2>
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={onClose}>
            ✕ ESC
          </button>
        </header>

        <div className="pixel-war-grid">
          {districts && (
            <div className="pixel-panel pixel-war-map-panel">
              <p className="pixel-panel-title">TOWN PULSE</p>
              <PixelWarMap districts={districts} selectedId={selectedId ?? null} pulseId={pulseId} />
            </div>
          )}

          <div className="pixel-panel">
            <p className="pixel-panel-title">TRUST OVER TIME</p>
            <TrustGraph values={trustHistory} />
            <p className="pixel-sub">mean trust dipped during invoice pulse</p>
          </div>

          <div className="pixel-panel pixel-war-log">
            <p className="pixel-panel-title">NEGOTIATION FEED</p>
            <ul className="pixel-log-scroll" style={{ transform: `translateY(-${scroll % 24}px)` }}>
              {[...log, ...log].map((line, i) => (
                <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="pixel-panel pixel-war-stats">
            <p className="pixel-panel-title">PRESSURE</p>
            {[
              ["TRAFFIC", 72, "#42A5F5"],
              ["SUPPORT", 58, "#FFA726"],
              ["BILLING", 81, "#EF5350"],
              ["SECURITY", 44, "#AB47BC"],
            ].map(([label, val, col]) => (
              <div key={String(label)} className="pixel-bar-row">
                <span className="pixel-bar-label">{label}</span>
                <div className="pixel-bar-track">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      className="pixel-bar-seg"
                      style={{
                        background: i < Math.round(Number(val) / 10) ? String(col) : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
