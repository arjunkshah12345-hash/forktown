"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { District, Actor, SyntheticUser, RehearsalRun } from "@/lib/sim/types";
import type { MigrationPlaybook } from "@/lib/github/playbook";
import type { Mind } from "@/lib/sim/mind";
import { PixelTownCanvas } from "@/components/retro/PixelTownCanvas";
import { PixelDistrictPanel } from "@/components/retro/PixelDistrictPanel";
import { PixelDialogue } from "@/components/retro/PixelDialogue";
import { PixelRehearseOverlay } from "@/components/retro/PixelRehearseOverlay";
import { WarRoom } from "@/components/WarRoom";
import { usePixelAudio } from "@/components/retro/usePixelAudio";
import { districtsToPixel, townspeopleToNpcs, mindLines } from "@/lib/pixel-map";
import { withBase } from "@/lib/paths";

export function LiveTownWorld({
  townId,
  districts,
  actors,
  users,
  minds = [],
  townName,
  playbook,
}: {
  townId: string;
  districts: District[];
  actors: Actor[];
  users: SyntheticUser[];
  minds?: Mind[];
  townName: string;
  playbook?: MigrationPlaybook | null;
}) {
  const pixelDistricts = useMemo(() => districtsToPixel(districts), [districts]);
  const npcs = useMemo(
    () => townspeopleToNpcs(actors, users, pixelDistricts),
    [actors, users, pixelDistricts],
  );
  const lines = useMemo(() => {
    if (minds.length) return mindLines(minds);
    return [
      {
        speaker: "Forge",
        portrait: "agent",
        text: `Welcome to ${townName}. Click a barn, then rehearse a real cutover — this runs the sim engine, not a fake script.`,
      },
    ];
  }, [minds, townName]);

  const pb = playbook ?? {
    kind: "billing" as const,
    title: "Stripe Checkout → custom invoices",
    hypothesis:
      "Dual-write + cohort flags + legacy bug opt-in will keep loss-averse buyers below churn threshold.",
    intensity: 3 as const,
    rationale: "Default billing rehearsal.",
  };

  const [selectedId, setSelectedId] = useState<string | null>(pixelDistricts[0]?.id ?? null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [music, setMusic] = useState(false);
  const [dayPhase, setDayPhase] = useState("DAY");
  const [season, setSeason] = useState("SPRING");
  const [focusSpeaker, setFocusSpeaker] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [rehearsing, setRehearsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState(0);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [run, setRun] = useState<RehearsalRun | null>(null);
  const [warOpen, setWarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rain, setRain] = useState(false);

  const { blip, rehearseStart, rehearseEnd, thunder } = usePixelAudio(music);
  const selected = pixelDistricts.find((d) => d.id === selectedId) ?? null;

  const runRehearse = useCallback(async () => {
    if (rehearsing) return;
    setError(null);
    setRehearsing(true);
    setProgress(4);
    setWarOpen(false);
    setRun(null);
    rehearseStart();
    setFlash(1);
    setShake(8);
    setRain(true);
    setPulseId(selectedId ?? pixelDistricts[0]?.id ?? null);

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(92, p + 3 + Math.random() * 4));
    }, 180);

    try {
      const res = await fetch(withBase(`/api/towns/${townId}/rehearse`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: pb.kind,
          title: pb.title,
          hypothesis: pb.hypothesis,
          agentName: "Forge",
          intensity: pb.intensity,
          runNow: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Rehearsal failed");
      clearInterval(tick);
      setProgress(100);
      setRun(data.run as RehearsalRun);
      if (data.run?.report?.survived) rehearseEnd();
      else thunder();
      setTimeout(() => {
        setRehearsing(false);
        setFlash(0);
        setShake(0);
        setRain(false);
        setWarOpen(true);
      }, 500);
    } catch (err) {
      clearInterval(tick);
      setRehearsing(false);
      setFlash(0);
      setShake(0);
      setRain(false);
      setProgress(0);
      setError(err instanceof Error ? err.message : "Rehearsal failed");
    }
  }, [
    rehearsing,
    rehearseStart,
    rehearseEnd,
    thunder,
    selectedId,
    pixelDistricts,
    townId,
    pb.kind,
    pb.title,
    pb.hypothesis,
    pb.intensity,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") setMusic((m) => !m);
      if (e.key === "r" || e.key === "R") void runRehearse();
      if (e.key === "Escape") setWarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runRehearse]);

  return (
    <div className="pixel-live-world">
      <div className="pixel-live-toolbar">
        <div className="pixel-live-meta">
          <span className="pixel-live-season">{season}</span>
          <span className="pixel-live-phase">{dayPhase}</span>
          <span className="pixel-live-hint">click barn · R rehearse · M music</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`pixel-btn ${music ? "pixel-btn-primary" : "pixel-btn-ghost"}`}
            onClick={() => setMusic((m) => !m)}
          >
            {music ? "♪ ON" : "♪ MUSIC"}
          </button>
          <button
            type="button"
            className="pixel-btn pixel-btn-primary"
            disabled={rehearsing}
            onClick={() => void runRehearse()}
          >
            {rehearsing ? "SIM RUNNING…" : `▶ REHEARSE ${pb.kind.toUpperCase()}`}
          </button>
          {run && (
            <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setWarOpen(true)}>
              ⚔ WAR ROOM
            </button>
          )}
          {run && (
            <Link href={withBase(`/runs/${run.id}`)} className="pixel-btn pixel-btn-ghost">
              REPORT
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p className="font-pixel text-[0.42rem] text-[var(--px-danger)] border-2 border-[var(--px-danger)] bg-[#3e1a16] px-3 py-2">
          {error}
        </p>
      )}

      <div className="pixel-scene pixel-live-scene">
        <PixelTownCanvas
          districts={pixelDistricts}
          npcs={npcs}
          selectedId={selectedId}
          pulseDistrict={pulseId}
          shake={shake}
          rehearseFlash={flash}
          rain={rain}
          rehearseProgress={progress}
          onSelect={(id) => {
            setSelectedId(id);
            setPanelOpen(true);
            blip();
          }}
          onBlip={blip}
          onDayPhase={(p) => setDayPhase(p)}
          onSeason={(s) => setSeason(s)}
          onNpcClick={(name) => {
            setFocusSpeaker(name);
            setFocusNonce((n) => n + 1);
            blip();
          }}
          ambientRain={season === "FALL"}
        />
        {panelOpen && selected && (
          <PixelDistrictPanel
            district={selected}
            onClose={() => setPanelOpen(false)}
            onFocusAgent={() => void runRehearse()}
          />
        )}
        <PixelRehearseOverlay
          active={rehearsing}
          progress={progress}
          label={pb.title}
        />
      </div>

      <div className="pixel-live-hotbar" role="toolbar" aria-label="Town actions">
        {[
          { key: "1", label: "TOWN", action: () => setWarOpen(false) },
          { key: "2", label: "REHEARSE", action: () => void runRehearse() },
          { key: "3", label: "WAR", action: () => run && setWarOpen(true) },
          { key: "4", label: "MUSIC", action: () => setMusic((m) => !m) },
        ].map((slot) => (
          <button key={slot.key} type="button" className="pixel-hotbar-item" onClick={slot.action}>
            <span className="pixel-hotbar-key">{slot.key}</span>
            <span className="pixel-hotbar-label">{slot.label}</span>
          </button>
        ))}
      </div>

      <div className="pixel-live-dialogue">
        <PixelDialogue
          lines={lines}
          focusSpeaker={focusSpeaker}
          focusNonce={focusNonce}
          onAdvance={() => blip()}
        />
      </div>

      {warOpen && run && (
        <div className="pixel-overlay" role="dialog" aria-modal>
          <div className="pixel-modal pixel-war-room pixel-real-war-modal">
            <header className="pixel-modal-head">
              <h2>⚔ WAR ROOM · LIVE RUN</h2>
              <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setWarOpen(false)}>
                ✕ CLOSE
              </button>
            </header>
            <WarRoom run={run} districts={districts} compact />
          </div>
        </div>
      )}
    </div>
  );
}
