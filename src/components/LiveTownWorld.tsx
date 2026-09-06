"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { District, Actor, SyntheticUser, RehearsalRun, WorldSnapshot } from "@/lib/sim/types";
import type { MigrationPlaybook } from "@/lib/github/playbook";
import type { Mind } from "@/lib/sim/mind";
import { PixelTownCanvas } from "@/components/retro/PixelTownCanvas";
import { PixelDistrictPanel } from "@/components/retro/PixelDistrictPanel";
import { PixelDialogue } from "@/components/retro/PixelDialogue";
import { PixelRehearseOverlay } from "@/components/retro/PixelRehearseOverlay";
import { PixelHUD } from "@/components/retro/PixelHUD";
import { PixelAchievement } from "@/components/retro/PixelAchievement";
import { PixelCeremony } from "@/components/retro/PixelCeremony";
import { PixelLiveTicker } from "@/components/retro/PixelLiveTicker";
import { WarRoom } from "@/components/WarRoom";
import { usePixelAudio } from "@/components/retro/usePixelAudio";
import { districtsToPixel, townspeopleToNpcs, mindLines } from "@/lib/pixel-map";
import { withBase } from "@/lib/paths";

const SAVE_KEY = "forktown-play-v1";
const COACH_KEY = "forktown-coach-v1";

const REHEARSE_BEATS = [
  "PREPARE · Forge dual-writes the legacy path…",
  "CANARY · 5% of villagers hit the new barn…",
  "CANARY · Mara K. smells a coupon ghost…",
  "CUTOVER · Invoice Barn flips the flag…",
  "STRESS · Ticket Cottage floods · anger rising…",
  "STRESS · Red Team Tower probes the window…",
  "RECOVERY · Agent negotiates with legacy buyers…",
  "RECOVERY · Trust curve settling…",
];

type SaveBlob = {
  music?: boolean;
  xp?: number;
  level?: number;
  energy?: number;
  lastRunId?: string;
  quests?: string[];
};

function loadSave(): SaveBlob {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}") as SaveBlob;
  } catch {
    return {};
  }
}

function writeSave(patch: SaveBlob) {
  if (typeof window === "undefined") return;
  const next = { ...loadSave(), ...patch };
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
}

function portraitFor(speaker: string): string {
  const s = speaker.toLowerCase();
  if (s.includes("forge") || s.includes("agent")) return "agent";
  if (s.includes("devon") || s.includes("sre")) return "sre";
  if (s.includes("angry") || s.includes("mara")) return "angry";
  return "buyer";
}

export function LiveTownWorld({
  townId,
  districts,
  actors,
  users,
  minds = [],
  townName,
  playbooks,
  world,
  priorRuns = 0,
}: {
  townId: string;
  districts: District[];
  actors: Actor[];
  users: SyntheticUser[];
  minds?: Mind[];
  townName: string;
  playbooks: MigrationPlaybook[];
  world: WorldSnapshot;
  priorRuns?: number;
}) {
  const router = useRouter();
  const pixelDistricts = useMemo(() => districtsToPixel(districts), [districts]);
  const npcs = useMemo(
    () => townspeopleToNpcs(actors, users, pixelDistricts),
    [actors, users, pixelDistricts],
  );

  const books = playbooks.length
    ? playbooks
    : [
        {
          kind: "billing" as const,
          title: "Stripe Checkout → custom invoices",
          hypothesis: "Dual-write + flags survive subjective pressure.",
          intensity: 3 as const,
          rationale: "Default",
        },
      ];

  const [bookIdx, setBookIdx] = useState(0);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(books[0]?.intensity ?? 3);
  const pb = books[Math.min(bookIdx, books.length - 1)] ?? books[0];

  const welcomeLines = useMemo(() => {
    const base = minds.length
      ? mindLines(minds)
      : [
          {
            speaker: "Forge",
            portrait: "agent",
            text: `Welcome to ${townName}. Pick a quest crop, set intensity, then rehearse — the engine is live.`,
          },
        ];
    return [
      ...base,
      {
        speaker: "Town crier",
        portrait: "buyer",
        text: `${world.customers.toLocaleString()} villagers · ${world.activeTickets} open tickets · traffic ${world.trafficRps} rps.`,
      },
    ];
  }, [minds, townName, world]);

  const [dialogueLines, setDialogueLines] = useState(welcomeLines);
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
  const [ceremonyOpen, setCeremonyOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rain, setRain] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [xp, setXp] = useState(priorRuns * 18);
  const [level, setLevel] = useState(1);
  const [energy, setEnergy] = useState(100);
  const [questsDone, setQuestsDone] = useState<string[]>([]);
  const [achievement, setAchievement] = useState<{ title: string; subtitle: string } | null>(null);
  const [trustHistory, setTrustHistory] = useState<number[]>([55, 58, 56, 60, 57]);
  const [beatIdx, setBeatIdx] = useState(0);
  const [coach, setCoach] = useState(false);
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    setDialogueLines(welcomeLines);
  }, [welcomeLines]);

  useEffect(() => {
    const s = loadSave();
    if (typeof s.music === "boolean") setMusic(s.music);
    if (typeof s.xp === "number") setXp(Math.max(priorRuns * 18, s.xp));
    if (typeof s.level === "number") setLevel(s.level);
    if (typeof s.energy === "number") setEnergy(s.energy);
    if (s.quests) setQuestsDone(s.quests);
    try {
      if (localStorage.getItem(COACH_KEY) !== "1") setCoach(true);
    } catch {
      setCoach(true);
    }
  }, [priorRuns]);

  useEffect(() => {
    setIntensity(pb.intensity);
  }, [pb.intensity, bookIdx]);

  useEffect(() => {
    writeSave({ music, xp, level, energy, quests: questsDone, lastRunId: run?.id });
  }, [music, xp, level, energy, questsDone, run?.id]);

  const { blip, rehearseStart, rehearseEnd, thunder, levelUp } = usePixelAudio(music);
  const selected = pixelDistricts.find((d) => d.id === selectedId) ?? null;

  const meanTrust = world.meanTrust ?? 0.58;
  const meanAnger = world.meanAnger ?? 0.22;
  const hudStats = {
    survivability: run?.report ? run.report.overall * 100 : meanTrust * 100,
    trust: Math.round((run?.report?.subjective?.meanTrust ?? meanTrust) * 100),
    anger: Math.round((run?.report?.subjective?.meanAnger ?? meanAnger) * 100),
    churnReady: run?.report?.subjective?.churnReady ?? world.churnIntent ?? 2,
    negotiationTurns: run?.dialogue?.length ?? 0,
    status: run?.status ?? "idle",
  };

  const newsLines = useMemo(() => {
    if (rehearsing) {
      return REHEARSE_BEATS.map((b) => b.replace("Forge", "Forge").replace("Invoice Barn", pb.title));
    }
    const base = [
      `${townName} · ${world.customers.toLocaleString()} villagers awake · ${dayPhase}`,
      `Trust ${(meanTrust * 100).toFixed(0)}% · anger ${(meanAnger * 100).toFixed(0)}% · tickets ${world.activeTickets}`,
      `Crop selected: ${pb.kind} · intensity ${intensity} · press R to rehearse`,
      `Traffic ${world.trafficRps} rps · season ${season} · level ${level}`,
    ];
    if (run?.report) {
      base.unshift(
        `Last run · ${run.report.survived ? "SURVIVED" : "COLLAPSE"} · ${(run.report.overall * 100).toFixed(0)}%`,
      );
    }
    return base;
  }, [
    rehearsing,
    townName,
    world,
    dayPhase,
    meanTrust,
    meanAnger,
    pb.kind,
    pb.title,
    intensity,
    season,
    level,
    run,
  ]);

  const unlock = useCallback((id: string, title: string, subtitle: string) => {
    setQuestsDone((prev) => {
      if (prev.includes(id)) return prev;
      setAchievement({ title, subtitle });
      return [...prev, id];
    });
  }, []);

  const dismissCoach = useCallback(() => {
    setCoach(false);
    try {
      localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const runRehearse = useCallback(async () => {
    if (rehearsing) return;
    if (energy < 12) {
      setError("LOW ENERGY · wait for Forge to catch breath");
      return;
    }
    dismissCoach();
    setError(null);
    setRehearsing(true);
    setProgress(4);
    setWarOpen(false);
    setCeremonyOpen(false);
    setCelebrate(false);
    setRun(null);
    setBeatIdx(0);
    setCombo(0);
    setEnergy((e) => Math.max(0, e - 12 - intensity * 2));
    rehearseStart();
    setFlash(1);
    setShake(6 + intensity);
    setRain(intensity >= 4);
    setPulseId(selectedId ?? pixelDistricts[0]?.id ?? null);

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(92, p + 2 + intensity + Math.random() * 3));
      setBeatIdx((b) => (b + 1) % REHEARSE_BEATS.length);
      setCombo((c) => c + 1);
      setShake((s) => Math.max(2, s - 0.4));
    }, 160);

    try {
      const res = await fetch(withBase(`/api/towns/${townId}/rehearse`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: pb.kind,
          title: pb.title,
          hypothesis: pb.hypothesis,
          agentName: "Forge",
          intensity,
          runNow: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Rehearsal failed");
      clearInterval(tick);
      setProgress(100);
      const nextRun = data.run as RehearsalRun;
      setRun(nextRun);
      const survived = Boolean(nextRun.report?.survived);

      // Pull real dialogue into the town square
      const fromRun = (nextRun.dialogue ?? [])
        .slice(0, 8)
        .map((d) => ({
          speaker: d.name,
          portrait: d.speaker === "agent" ? "agent" : portraitFor(d.name),
          text: d.text,
        }));
      if (fromRun.length) {
        setDialogueLines([
          ...fromRun,
          {
            speaker: "Town crier",
            portrait: "buyer",
            text: survived
              ? `Cutover held at ${((nextRun.report?.overall ?? 0) * 100).toFixed(0)}%. Open the war room.`
              : `Town scarred. Survivability ${((nextRun.report?.overall ?? 0) * 100).toFixed(0)}%. Scrub the war room.`,
          },
        ]);
        setFocusSpeaker(fromRun[0]?.speaker ?? null);
        setFocusNonce((n) => n + 1);
      }

      if (survived) {
        rehearseEnd();
        setCelebrate(true);
        setRain(false);
        unlock(`survive-${pb.kind}`, "CUTOVER HELD", `${pb.kind} rehearsal survived`);
        if (intensity >= 4) unlock("hard-mode", "HARD MODE", "Survived intensity 4+");
      } else {
        thunder();
        setRain(true);
        unlock(`scar-${pb.kind}`, "NEAR MISS", `Town scarred by ${pb.kind} pressure`);
      }
      const gained = 20 + intensity * 8 + (survived ? 15 : 5);
      setXp((x) => {
        const total = x + gained;
        const nextLevel = 1 + Math.floor(total / 100);
        setLevel((prev) => {
          if (nextLevel > prev) levelUp();
          return nextLevel;
        });
        return total;
      });
      if (nextRun.snapshots?.length) {
        setTrustHistory(
          nextRun.snapshots
            .map((s) => Math.round((s.meanTrust ?? 0.5) * 100))
            .slice(-8),
        );
      }
      unlock("first-rehearse", "FIRST REHEARSAL", "Ran the live sim engine");
      setTimeout(() => {
        setRehearsing(false);
        setFlash(0);
        setShake(0);
        setCeremonyOpen(true);
      }, 700);
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
    energy,
    intensity,
    rehearseStart,
    rehearseEnd,
    thunder,
    levelUp,
    selectedId,
    pixelDistricts,
    townId,
    pb.kind,
    pb.title,
    pb.hypothesis,
    unlock,
    dismissCoach,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") setMusic((v) => !v);
      if (e.key === "r" || e.key === "R") void runRehearse();
      if (e.key === "q" || e.key === "Q") setQuestOpen((v) => !v);
      if (e.key === "w" || e.key === "W") {
        if (run) setWarOpen(true);
      }
      if (e.key === "Escape") {
        setWarOpen(false);
        setCeremonyOpen(false);
        setAchievement(null);
        setCoach(false);
      }
      if (e.key >= "1" && e.key <= "5") {
        const i = Number(e.key) - 1;
        if (books[i]) {
          setBookIdx(i);
          blip();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runRehearse, books, blip, run]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setEnergy((e) => Math.min(100, e + 1));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const questItems = [
    { id: "first-rehearse", label: "Run a live rehearsal" },
    { id: "survive-billing", label: "Survive a billing cutover" },
    { id: "survive-auth", label: "Survive an auth cutover" },
    { id: "hard-mode", label: "Survive intensity 4+" },
    { id: "scar-billing", label: "Take a billing scar (learn)" },
    { id: "mitigate", label: "Offer dual-write to Mara" },
  ];

  return (
    <div className="pixel-play pixel-play-immersive">
      <div className="pixel-play-top">
        <div>
          <p className="font-pixel text-[0.42rem] text-[var(--px-gold)]">◆ {townName.toUpperCase()}</p>
          <p className="pixel-sub">
            {dayPhase} · {season} · R rehearse · W war · Q quests · 1–5 crops · M music
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="pixel-btn pixel-btn-ghost">
            ← TOWN SQUARE
          </Link>
          <button
            type="button"
            className={`pixel-btn ${music ? "pixel-btn-primary" : "pixel-btn-ghost"}`}
            onClick={() => setMusic((m) => !m)}
          >
            {music ? "♪ ON" : "♪ MUSIC"}
          </button>
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setQuestOpen((v) => !v)}>
            ★ QUESTS
          </button>
          <button
            type="button"
            className="pixel-btn pixel-btn-primary"
            disabled={rehearsing}
            onClick={() => void runRehearse()}
          >
            {rehearsing ? "SIM RUNNING…" : "▶ REHEARSE"}
          </button>
          {run && (
            <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setWarOpen(true)}>
              ⚔ WAR
            </button>
          )}
          {run && (
            <Link href={`/runs/${run.id}`} className="pixel-btn pixel-btn-ghost">
              REPORT
            </Link>
          )}
        </div>
      </div>

      <PixelLiveTicker
        lines={
          rehearsing
            ? [REHEARSE_BEATS[beatIdx] ?? REHEARSE_BEATS[0], ...newsLines]
            : newsLines
        }
        badge={rehearsing ? "SIM" : "NEWS"}
        intervalMs={rehearsing ? 900 : 3600}
      />

      {error && (
        <p className="font-pixel text-[0.42rem] text-[var(--px-danger)] border-2 border-[var(--px-danger)] bg-[#3e1a16] px-3 py-2">
          {error}
        </p>
      )}

      <div className="pixel-play-grid">
        <div className="pixel-play-main">
          <div className="pixel-scene pixel-live-scene pixel-play-scene">
            <PixelTownCanvas
              districts={pixelDistricts}
              npcs={npcs}
              selectedId={selectedId}
              pulseDistrict={pulseId}
              shake={shake}
              rehearseFlash={flash}
              rain={rain || season === "FALL"}
              ambientRain={intensity >= 5 && rehearsing}
              rehearseProgress={progress}
              celebrate={celebrate}
              combo={celebrate ? Math.max(3, combo) : rehearsing ? Math.floor(combo / 4) : 0}
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
              label={rehearsing ? (REHEARSE_BEATS[beatIdx] ?? pb.title) : pb.title}
            />
            {coach && !rehearsing && (
              <div className="pixel-coach">
                <p className="pixel-coach-title">HOW TO PLAY</p>
                <ol>
                  <li>Pick a crop (1–5) — billing, auth, data…</li>
                  <li>Set intensity — higher = meaner villagers</li>
                  <li>Press <kbd>R</kbd> — real sim engine runs</li>
                  <li>Open war room — scrub the cutover</li>
                </ol>
                <button type="button" className="pixel-btn pixel-btn-primary" onClick={dismissCoach}>
                  GOT IT · LET&apos;S GO
                </button>
              </div>
            )}
          </div>

          <div className="pixel-hotbar">
            {[
              ["1-5", "crops"],
              ["R", "rehearse"],
              ["W", "war"],
              ["Q", "quests"],
              ["M", "music"],
              ["Esc", "close"],
            ].map(([k, label]) => (
              <span key={k} className="pixel-hotbar-item">
                <span className="pixel-hotbar-key">{k}</span>
                <span className="pixel-hotbar-label">{label}</span>
              </span>
            ))}
          </div>

          <div className="pixel-quest-rail">
            <p className="pixel-panel-title">CROPS · QUESTS</p>
            <div className="pixel-quest-books">
              {books.map((b, i) => (
                <button
                  key={b.kind}
                  type="button"
                  className={`pixel-quest-book ${i === bookIdx ? "active" : ""}`}
                  onClick={() => {
                    setBookIdx(i);
                    blip();
                  }}
                >
                  <span className="pixel-quest-book-n">{i + 1}</span>
                  <span>
                    <span className="pixel-quest-book-t">{b.kind}</span>
                    <span className="pixel-quest-book-d">{b.title}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="pixel-intensity">
              <p className="pixel-panel-title">INTENSITY · {intensity}</p>
              <div className="pixel-intensity-row">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`pixel-btn ${intensity === n ? "pixel-btn-primary" : "pixel-btn-ghost"}`}
                    onClick={() => setIntensity(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="pixel-sub mt-2">{pb.hypothesis}</p>
            </div>
          </div>

          <div className="pixel-live-dialogue">
            <PixelDialogue
              lines={dialogueLines}
              focusSpeaker={focusSpeaker}
              focusNonce={focusNonce}
              onAdvance={() => blip()}
              onChoice={(choice) => {
                blip();
                if (choice === "mitigate") unlock("mitigate", "DIPLOMAT", "Offered dual-write to Mara");
              }}
            />
          </div>
        </div>

        <div className="pixel-play-side">
          <PixelHUD
            stats={hudStats}
            selected={selected}
            trustHistory={trustHistory}
            dayPhase={dayPhase}
            season={season}
            xp={xp}
            level={level}
            maraTrust={Math.round(
              (minds.find((m) => m.name.toLowerCase().includes("mara"))?.affect.trust ?? 0.42) * 100,
            )}
            energy={energy}
          />
          {questOpen && (
            <div className="pixel-panel mt-2">
              <p className="pixel-panel-title">★ QUEST LOG</p>
              <ul className="pixel-quest-list">
                {questItems.map((q) => (
                  <li key={q.id} className={questsDone.includes(q.id) ? "done" : ""}>
                    {questsDone.includes(q.id) ? "✓" : "○"} {q.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {achievement && (
        <PixelAchievement
          show
          title={achievement.title}
          subtitle={achievement.subtitle}
          onDone={() => setAchievement(null)}
        />
      )}

      {ceremonyOpen && run && (
        <PixelCeremony
          run={run}
          onContinue={() => {
            setCeremonyOpen(false);
            setWarOpen(true);
            blip();
          }}
          onReport={() => {
            setCeremonyOpen(false);
            router.push(`/runs/${run.id}`);
          }}
        />
      )}

      {warOpen && run && (
        <div className="pixel-overlay" role="dialog" aria-modal>
          <div className="pixel-modal pixel-war-room pixel-real-war-modal">
            <header className="pixel-modal-head">
              <h2>
                ⚔ WAR ROOM · {run.report?.survived ? "SURVIVED" : "COLLAPSE"} ·{" "}
                {run.report ? `${(run.report.overall * 100).toFixed(0)}%` : ""}
              </h2>
              <div className="flex gap-2">
                <Link href={`/runs/${run.id}`} className="pixel-btn pixel-btn-primary">
                  FULL REPORT
                </Link>
                <button type="button" className="pixel-btn pixel-btn-ghost" onClick={() => setWarOpen(false)}>
                  ✕
                </button>
              </div>
            </header>
            <WarRoom run={run} districts={districts} compact />
          </div>
        </div>
      )}
    </div>
  );
}
