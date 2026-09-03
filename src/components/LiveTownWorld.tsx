"use client";

import { useMemo, useState } from "react";
import type { District, Actor, SyntheticUser } from "@/lib/sim/types";
import { PixelTownCanvas } from "@/components/retro/PixelTownCanvas";
import { PixelDistrictPanel } from "@/components/retro/PixelDistrictPanel";
import { PixelDialogue } from "@/components/retro/PixelDialogue";
import { usePixelAudio } from "@/components/retro/usePixelAudio";
import { districtsToPixel, townspeopleToNpcs, mindLines } from "@/lib/pixel-map";
import type { Mind } from "@/lib/sim/mind";

export function LiveTownWorld({
  districts,
  actors,
  users,
  minds = [],
  townName,
}: {
  districts: District[];
  actors: Actor[];
  users: SyntheticUser[];
  minds?: Mind[];
  townName: string;
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
        text: `Welcome to ${townName}. Click a barn to inspect pressure. Rehearse before you ship.`,
      },
      {
        speaker: "Town crier",
        portrait: "buyer",
        text: "Subjective minds are awake. Loss aversion is already baking into tonight's bills.",
      },
    ];
  }, [minds, townName]);

  const [selectedId, setSelectedId] = useState<string | null>(pixelDistricts[0]?.id ?? null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [music, setMusic] = useState(false);
  const [dayPhase, setDayPhase] = useState("DAY");
  const [season, setSeason] = useState("SPRING");
  const [focusSpeaker, setFocusSpeaker] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const { blip } = usePixelAudio(music);
  const selected = pixelDistricts.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="pixel-live-world">
      <div className="pixel-live-toolbar">
        <div className="pixel-live-meta">
          <span className="pixel-live-season">{season}</span>
          <span className="pixel-live-phase">{dayPhase}</span>
          <span className="pixel-live-hint">scroll zoom · click district · M music</span>
        </div>
        <button
          type="button"
          className={`pixel-btn ${music ? "pixel-btn-primary" : "pixel-btn-ghost"}`}
          onClick={() => setMusic((m) => !m)}
        >
          {music ? "♪ MUSIC ON" : "♪ MUSIC"}
        </button>
      </div>

      <div className="pixel-scene pixel-live-scene">
        <PixelTownCanvas
          districts={pixelDistricts}
          npcs={npcs}
          selectedId={selectedId}
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
          <PixelDistrictPanel district={selected} onClose={() => setPanelOpen(false)} />
        )}
      </div>

      <div className="pixel-live-dialogue">
        <PixelDialogue
          lines={lines}
          focusSpeaker={focusSpeaker}
          focusNonce={focusNonce}
          onAdvance={() => blip()}
        />
      </div>
    </div>
  );
}
