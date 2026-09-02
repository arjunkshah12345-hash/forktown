"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/paths";
import { PixelAchievement } from "@/components/retro/PixelAchievement";
import { PixelAchievementLog } from "@/components/retro/PixelAchievementLog";
import { PixelCharacterSheet } from "@/components/retro/PixelCharacterSheet";
import { PixelCredits } from "@/components/retro/PixelCredits";
import { PixelDialogue, PixelWarRoom } from "@/components/retro/PixelDialogue";
import { PixelDistrictPanel } from "@/components/retro/PixelDistrictPanel";
import { PixelHUD } from "@/components/retro/PixelHUD";
import { PixelLegend } from "@/components/retro/PixelLegend";
import { PixelRehearseOverlay } from "@/components/retro/PixelRehearseOverlay";
import { PixelTicker } from "@/components/retro/PixelTicker";
import { PixelTitleScreen } from "@/components/retro/PixelTitleScreen";
import { loadSampleSave, writeSampleSave } from "@/components/retro/sample-save";
import { PixelTownCanvas } from "@/components/retro/PixelTownCanvas";
import { usePixelAudio } from "@/components/retro/usePixelAudio";
import {
  SAMPLE_DIALOGUE,
  SAMPLE_DISTRICTS,
  SAMPLE_NPCS,
  SAMPLE_STATS,
  SAMPLE_TRUST_HISTORY,
  SAMPLE_WAR_LOG,
} from "@/components/retro/sample-data";

type Tab = "town" | "war" | "report" | "keys" | "connect" | "quest";

const HOTBAR: { key: string; tab: Tab; icon: string; label: string }[] = [
  { key: "1", tab: "town", icon: "⌂", label: "TOWN" },
  { key: "2", tab: "war", icon: "⚔", label: "WAR ROOM" },
  { key: "3", tab: "report", icon: "📜", label: "REPORT" },
  { key: "4", tab: "keys", icon: "🔑", label: "KEYS" },
  { key: "5", tab: "connect", icon: "🔗", label: "CONNECT" },
  { key: "6", tab: "quest", icon: "★", label: "QUEST" },
];

export default function RetroSamplePage() {
  const consoleRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>("d1");
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("town");
  const [warOpen, setWarOpen] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [rehearsing, setRehearsing] = useState(false);
  const [rehearseProgress, setRehearseProgress] = useState(0);
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showQuest, setShowQuest] = useState(true);
  const [music, setMusic] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [achievement, setAchievement] = useState<{ title: string; subtitle: string } | null>(null);
  const [dayPhase, setDayPhase] = useState("DAY");
  const [xp, setXp] = useState(40);
  const [level, setLevel] = useState(1);
  const [toastExtra, setToastExtra] = useState<string | null>(null);
  const [focusSpeaker, setFocusSpeaker] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [combo, setCombo] = useState(0);
  const [questSurvive, setQuestSurvive] = useState(false);
  const [questMara, setQuestMara] = useState(false);
  const [entering, setEntering] = useState(false);
  const [ambientRain, setAmbientRain] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [celebrate, setCelebrate] = useState(false);
  const [trustDelta, setTrustDelta] = useState(0);
  const [season, setSeason] = useState("SPRING");
  const [legendOpen, setLegendOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const [maraTrust, setMaraTrust] = useState(42);
  const [energy, setEnergy] = useState(100);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [achieveLogOpen, setAchieveLogOpen] = useState(false);
  const tipsShown = useRef(false);

  const TIPS = [
    "Click a district to inspect pressure",
    "Click an NPC to jump dialogue",
    "Press R to rehearse a cutover",
    "Press L for the map legend",
    "Scroll or =/− to zoom the town",
    "Press J for achievements",
  ];

  const unlock = useCallback((id: string, title: string, subtitle: string) => {
    setAchievements((prev) => {
      if (prev.includes(id)) return prev;
      setAchievement({ title, subtitle });
      return [...prev, id];
    });
  }, []);

  const { blip, rehearseStart, rehearseEnd, thunder } = usePixelAudio(music && started && !paused);
  const selected = SAMPLE_DISTRICTS.find((d) => d.id === selectedId) ?? null;

  const selectDistrict = useCallback(
    (id: string) => {
      setSelectedId(id);
      setPanelOpen(true);
      blip();
    },
    [blip],
  );

  const runRehearse = useCallback(() => {
    if (rehearsing || paused) return;
    if (energy < 18) {
      setToast("LOW ENERGY · rest a moment");
      return;
    }
    setEnergy((e) => Math.max(0, e - 18));
    rehearseStart();
    setRehearsing(true);
    setRehearseProgress(0);
    setPulseId(selectedId ?? "d1");
    setShake(3);
    setFlash(1);
    setToast("REHEARSAL STARTED…");
    setCombo(0);
    if (music) {
      setTimeout(() => {
        thunder();
        setShake(2);
        setTimeout(() => setShake(0), 400);
      }, 400);
      setTimeout(() => {
        thunder();
        setShake(3);
        setTimeout(() => setShake(0), 500);
      }, 1800);
    }

    let p = 0;
    const id = setInterval(() => {
      p += 4 + Math.random() * 6;
      setRehearseProgress(Math.min(100, p));
      if (p > 20 && p < 95) setCombo((c) => c + 1);
      if (p >= 100) {
        clearInterval(id);
        setRehearsing(false);
        setShake(0);
        setFlash(0);
        setCombo(0);
        rehearseEnd();
        setToast("SURVIVED · 71.7%");
        setQuestSurvive(true);
        setQuestMara(true);
        setMaraTrust((t) => Math.min(100, t + 8));
        unlock("survive", "SURVIVOR", "Cleared a rehearsal alive");
        setSavedFlash(true);
        setXp((x) => {
          const next = x + 35;
          if (next >= 100) {
            setLevel((l) => {
              const nl = l + 1;
              if (nl >= 2) unlock("level-2", "RISING AGENT", "Reached agent level 2");
              return nl;
            });
            setToastExtra("LEVEL UP!");
            return next - 100;
          }
          return next;
        });
        setWarOpen(true);
        setTab("war");
        setCelebrate(true);
        setTimeout(() => setCreditsOpen(true), 900);
        setTimeout(() => setCelebrate(false), 2800);
      }
    }, 90);
  }, [rehearsing, paused, selectedId, rehearseStart, rehearseEnd, music, thunder, energy, unlock]);

  const focusAgent = useCallback(() => {
    if (energy < 8) {
      setToast("FORGE TIRED · energy low");
      return;
    }
    setEnergy((e) => Math.max(0, e - 8));
    blip();
    setToast(`FORGE → ${selected?.name ?? "town"}`);
  }, [blip, selected, energy]);

  const onNpcClick = useCallback(
    (name: string) => {
      blip();
      setFocusSpeaker(name);
      setFocusNonce((n) => n + 1);
      setToast(`TALK · ${name}`);
      unlock("first-talk", "FIRST CONTACT", "Spoke with a town mind");
    },
    [blip, unlock],
  );

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") {
        setPaused((v) => !v);
        return;
      }
      if (paused) {
        if (e.key === "Escape") setPaused(false);
        return;
      }
      const slot = HOTBAR.find((h) => h.key === e.key);
      if (slot) {
        setTab(slot.tab);
        if (slot.tab === "war") setWarOpen(true);
        if (slot.tab === "quest") setShowQuest((v) => !v);
        if (slot.tab === "keys") window.location.href = withBase("/settings/keys");
        if (slot.tab === "connect") window.location.href = withBase("/connect");
        if (slot.tab === "report") window.location.href = withBase("/runs/wnzdt-HsH2fj");
      }
      if (e.key === "Escape") {
        setWarOpen(false);
        setPanelOpen(false);
        setSheetOpen(false);
        setLegendOpen(false);
        setCreditsOpen(false);
        setAchieveLogOpen(false);
      }
      if (e.key === "c" || e.key === "C") setSheetOpen((v) => !v);
      if (e.key === "l" || e.key === "L") setLegendOpen((v) => !v);
      if (e.key === "j" || e.key === "J") setAchieveLogOpen((v) => !v);
      if (e.key === "m" || e.key === "M") setMusic((m) => !m);
      if (e.key === "]" || e.key === "[") {
        setSpeed((s) => (e.key === "]" ? Math.min(3, s + 1) : Math.max(1, s - 1)));
        setToast(`SPEED ×${e.key === "]" ? Math.min(3, speed + 1) : Math.max(1, speed - 1)}`);
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const ids = SAMPLE_DISTRICTS.map((d) => d.id);
        const cur = ids.indexOf(selectedId ?? ids[0]);
        const next = e.key === "ArrowRight" ? (cur + 1) % ids.length : (cur - 1 + ids.length) % ids.length;
        selectDistrict(ids[next]);
      }
      if (e.key === "f" || e.key === "F") {
        void consoleRef.current?.requestFullscreen?.();
      }
      if ((e.key === "r" || e.key === "R") && !rehearsing) runRehearse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, paused, runRehearse, rehearsing, selectDistrict, selectedId, speed]);

  useEffect(() => {
    if (!started) return;
    writeSampleSave({
      xp,
      level,
      questSurvive,
      questMara,
      music,
      visited: true,
      maraTrust,
      energy,
      achievements,
    });
  }, [started, xp, level, questSurvive, questMara, music, maraTrust, energy, achievements]);

  useEffect(() => {
    if (!started || paused) return;
    const id = setInterval(() => {
      setEnergy((e) => Math.min(100, e + 2.5));
    }, 2200);
    return () => clearInterval(id);
  }, [started, paused]);

  useEffect(() => {
    if (!started) return;
    unlock("first-enter", "TOWN ARRIVAL", "Entered the pixel sample");
  }, [started, unlock]);

  useEffect(() => {
    if (!started || paused) return;
    const id = setInterval(() => {
      setAmbientRain((r) => {
        if (rehearsing) return r;
        return Math.random() < 0.22 ? !r : r;
      });
    }, 14000);
    return () => clearInterval(id);
  }, [started, paused, rehearsing]);

  useEffect(() => {
    if (!started || tipsShown.current) return;
    tipsShown.current = true;
    let i = 0;
    setToast(TIPS[0]);
    const id = setInterval(() => {
      i++;
      if (i >= TIPS.length) {
        clearInterval(id);
        return;
      }
      setTipIdx(i);
      setToast(TIPS[i]);
    }, 3200);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!toastExtra) return;
    const id = setTimeout(() => setToastExtra(null), 2400);
    return () => clearTimeout(id);
  }, [toastExtra]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!savedFlash) return;
    const id = setTimeout(() => setSavedFlash(false), 2200);
    return () => clearTimeout(id);
  }, [savedFlash]);

  if (!started) {
    return (
      <PixelTitleScreen
        onStart={(opts) => {
          if (opts?.continueSave) {
            const s = loadSampleSave();
            if (s) {
              setXp(s.xp);
              setLevel(s.level);
              setQuestSurvive(s.questSurvive);
              setQuestMara(s.questMara);
              setMusic(s.music);
              setMaraTrust(s.maraTrust);
              setEnergy(s.energy);
              setAchievements(s.achievements);
            }
          }
          setEntering(true);
          setTimeout(() => setStarted(true), 480);
        }}
      />
    );
  }

  return (
    <div className={`pixel-root pixel-cursor-root ${entering ? "pixel-iris-in" : ""}`}>
      <p className="pixel-banner">
        UI SAMPLE · 8-BIT · <Link href="/">production ↗</Link>
        {" · "}
        <span className="pixel-banner-keys">
          R rehearse · ←→ · [ ] speed · =/− zoom · L legend · J medals · P pause · M music
        </span>
      </p>

      {toast && <div className="pixel-toast">{toast}</div>}
      {toastExtra && <div className="pixel-toast pixel-toast-level">{toastExtra}</div>}
      {savedFlash && <div className="pixel-autosave">AUTO-SAVE ✓</div>}

      <PixelAchievement
        show={!!achievement}
        title={achievement?.title ?? ""}
        subtitle={achievement?.subtitle ?? ""}
        onDone={() => setAchievement(null)}
      />

      <PixelCharacterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <PixelLegend open={legendOpen} onClose={() => setLegendOpen(false)} />
      <PixelAchievementLog
        open={achieveLogOpen}
        onClose={() => setAchieveLogOpen(false)}
        unlocked={achievements}
      />
      <PixelCredits
        open={creditsOpen}
        onClose={() => setCreditsOpen(false)}
        survivability={SAMPLE_STATS.survivability}
      />

      {paused && (
        <div className="pixel-pause" role="dialog" aria-modal>
          <div className="pixel-pause-box">
            <p className="pixel-pause-title">⏸ PAUSED</p>
            <ul className="pixel-pause-list">
              <li>
                <kbd>R</kbd> Rehearse migration
              </li>
              <li>
                <kbd>C</kbd> Town census
              </li>
              <li>
                <kbd>J</kbd> Achievements
              </li>
              <li>
                <kbd>= / −</kbd> Zoom town
              </li>
              <li>
                <kbd>M</kbd> Toggle music
              </li>
              <li>
                <kbd>1–6</kbd> Hotbar
              </li>
              <li>
                <kbd>[ ]</kbd> Speed ×{speed}
              </li>
              <li>
                <kbd>← →</kbd> Cycle districts
              </li>
            </ul>
            <button type="button" className="pixel-btn pixel-btn-primary" onClick={() => setPaused(false)}>
              ▶ RESUME
            </button>
          </div>
        </div>
      )}

      <div className="pixel-console" ref={consoleRef}>
        <div className="pixel-console-bezel">
          <div className="pixel-game">
            <header className="pixel-topbar">
              <Link href="/sample" className="pixel-logo">
                FORK<span>TOWN</span>
              </Link>

              <div className="pixel-coins">
                <span className="pixel-coin-icon" aria-hidden />
                <span>{SAMPLE_STATS.survivability.toFixed(1)}%</span>
                <span className="pixel-coin-sep">♥</span>
                <span>{SAMPLE_STATS.trust + trustDelta}%</span>
                {music && <span className="pixel-music-badge">♪</span>}
              </div>

              <div className="pixel-topbar-links">
                <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setSheetOpen(true)}>
                  👥 CENSUS
                </button>
                <button
                  type="button"
                  className={`pixel-btn pixel-btn-ghost ${music ? "pixel-btn-on" : ""}`}
                  onClick={() => setMusic((m) => !m)}
                >
                  {music ? "♪ ON" : "♪"}
                </button>
                <button
                  type="button"
                  className="pixel-btn pixel-btn-primary"
                  onClick={runRehearse}
                  disabled={rehearsing || paused}
                >
                  {rehearsing ? "… REHEARSING" : "▶ REHEARSE"}
                </button>
                <Link href="/" className="pixel-btn pixel-btn-ghost">
                  MAIN
                </Link>
              </div>
            </header>

            <PixelTicker />

            <div className="pixel-main">
              <div className="pixel-scene-wrap">
                <PixelRehearseOverlay
                  active={rehearsing}
                  progress={rehearseProgress}
                  label={`REHEARSING ${selected?.name ?? "TOWN"}`.toUpperCase()}
                />
                <PixelTownCanvas
                  districts={SAMPLE_DISTRICTS}
                  npcs={SAMPLE_NPCS}
                  selectedId={selectedId}
                  onSelect={selectDistrict}
                  pulseDistrict={pulseId}
                  shake={paused ? 0 : shake}
                  rehearseFlash={flash}
                  rain={rehearsing}
                  rehearseProgress={rehearseProgress}
                  onBlip={blip}
                  onDayPhase={(phase) => setDayPhase(phase)}
                  onSeason={(s) => setSeason(s)}
                  onNpcClick={onNpcClick}
                  combo={combo}
                  ambientRain={ambientRain && !rehearsing}
                  speed={speed}
                  celebrate={celebrate}
                  paused={paused}
                />

                {selected && panelOpen && (
                  <PixelDistrictPanel
                    district={selected}
                    onClose={() => setPanelOpen(false)}
                    onFocusAgent={focusAgent}
                  />
                )}

                {showQuest && (
                  <div className="pixel-quest">
                    <p className="pixel-quest-title">★ QUESTS</p>
                    <p className="done">✓ Fingerprint billing + auth</p>
                    <p className="done">✓ Spawn 85 minds</p>
                    <p className={questSurvive ? "done" : selectedId === "d1" ? "active" : ""}>
                      {questSurvive ? "✓" : "→"} Survive Invoice Barn
                    </p>
                    <p className={questMara ? "done" : ""}>
                      {questMara ? "✓" : "→"} Win over Mara K.
                    </p>
                  </div>
                )}

                <div className="pixel-inventory" aria-label="Inventory">
                  {[
                    { icon: "🎟", label: "Ticket", tip: "Rehearsal ticket" },
                    { icon: "⚑", label: "Flag", tip: "Dual-write ON", on: true },
                    { icon: "🔑", label: "Key", tip: "Agent API key" },
                    { icon: "📜", label: "Report", tip: "Last run export" },
                  ].map((item) => (
                    <div key={item.label} className={`pixel-inv-slot ${item.on ? "on" : ""}`} title={item.tip}>
                      <span className="pixel-inv-icon">{item.icon}</span>
                      <span className="pixel-inv-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <PixelHUD
                stats={SAMPLE_STATS}
                selected={selected}
                trustHistory={SAMPLE_TRUST_HISTORY}
                dayPhase={dayPhase}
                season={season}
                xp={xp}
                level={level}
                maraTrust={maraTrust}
                energy={energy}
              />
            </div>

            <PixelDialogue
              lines={SAMPLE_DIALOGUE}
              focusSpeaker={focusSpeaker}
              focusNonce={focusNonce}
              onChoice={(choice) => {
                blip();
                if (choice === "mitigate") {
                  setTrustDelta((d) => d + 4);
                  setMaraTrust((t) => Math.min(100, t + 12));
                  setToast("DUAL-WRITE OFFERED · Mara +12");
                  setQuestMara(true);
                  unlock("mitigate", "DIPLOMAT", "Offered dual-write to Mara");
                } else {
                  setTrustDelta((d) => d - 3);
                  setMaraTrust((t) => Math.max(0, t - 8));
                  setToast("CUTOVER PUSHED · Mara anger ↑");
                }
              }}
            />

            <nav className="pixel-hotbar" aria-label="Action bar">
              {HOTBAR.map((slot) => (
                <button
                  key={slot.key}
                  type="button"
                  className="pixel-hotbar-item"
                  title={`${slot.key} · ${slot.label}`}
                  onClick={() => {
                    blip();
                    setTab(slot.tab);
                    if (slot.tab === "war") setWarOpen(true);
                    if (slot.tab === "quest") setShowQuest((v) => !v);
                    if (slot.tab === "keys") window.location.href = withBase("/settings/keys");
                    if (slot.tab === "connect") window.location.href = withBase("/connect");
                    if (slot.tab === "report") window.location.href = withBase("/runs/wnzdt-HsH2fj");
                  }}
                >
                  <div className={`pixel-slot ${tab === slot.tab ? "pixel-slot-active" : ""}`}>
                    <span className="pixel-slot-key">{slot.key}</span>
                    <span className="pixel-slot-icon">{slot.icon}</span>
                  </div>
                  <span className="pixel-slot-label">{slot.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        <p className="pixel-console-label">FORKTOWN · PIXEL SAMPLE · SNES</p>
      </div>

      <PixelWarRoom
        open={warOpen}
        onClose={() => setWarOpen(false)}
        trustHistory={SAMPLE_TRUST_HISTORY}
        log={SAMPLE_WAR_LOG}
        districts={SAMPLE_DISTRICTS}
        selectedId={selectedId}
        pulseId={pulseId}
      />
    </div>
  );
}
