"use client";

import { PixelPortrait } from "./PixelPortrait";
import { SAMPLE_NPCS } from "./sample-data";

export function PixelCharacterSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="pixel-overlay pixel-overlay-sheet" role="dialog" aria-modal>
      <div className="pixel-modal pixel-sheet">
        <header className="pixel-modal-head">
          <h2>👥 TOWN CENSUS</h2>
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={onClose}>
            ✕ ESC
          </button>
        </header>
        <ul className="pixel-sheet-list">
          {SAMPLE_NPCS.map((n) => (
            <li key={n.id} className="pixel-sheet-row">
              <PixelPortrait type={n.mood === "angry" ? "angry" : n.role === "Agent" ? "agent" : n.mood === "anxious" ? "anxious" : "calm"} />
              <div>
                <p className="pixel-sheet-name">{n.name}</p>
                <p className="pixel-sheet-role">{n.role}</p>
                <div className="pixel-sheet-mood">
                  MOOD{" "}
                  <span className={`mood-${n.mood}`}>{n.mood.toUpperCase()}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="pixel-sheet-foot">+ 81 synthetic minds off-map · prospect theory λ varies</p>
      </div>
    </div>
  );
}
