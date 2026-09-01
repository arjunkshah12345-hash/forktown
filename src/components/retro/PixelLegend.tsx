"use client";

export function PixelLegend({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="pixel-overlay" role="dialog" aria-modal onClick={onClose}>
      <div className="pixel-modal pixel-legend" onClick={(e) => e.stopPropagation()}>
        <header className="pixel-modal-head">
          <h2>🗺 LEGEND</h2>
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={onClose}>
            ✕ L / ESC
          </button>
        </header>
        <ul className="pixel-legend-list">
          <li>
            <span className="swatch roof" style={{ background: "#E67E22" }} /> Billing / finance
          </li>
          <li>
            <span className="swatch roof" style={{ background: "#3498DB" }} /> Auth / edge
          </li>
          <li>
            <span className="swatch roof" style={{ background: "#27AE60" }} /> API pier
          </li>
          <li>
            <span className="swatch roof" style={{ background: "#9B59B6" }} /> Data silo
          </li>
          <li>
            <span className="swatch roof" style={{ background: "#E74C3C" }} /> Support
          </li>
          <li>
            <span className="swatch roof" style={{ background: "#34495E" }} /> Security tower
          </li>
          <li>
            <span className="swatch npc" style={{ background: "#5DADE2" }} /> Forge (agent)
          </li>
          <li>
            <span className="swatch bar-hp" /> Floating HP · <span className="swatch bar-load" /> Load
          </li>
          <li>Dashed blue trail = agent path to selected district</li>
          <li>Night: townsfolk retreat home · lanterns glow</li>
        </ul>
      </div>
    </div>
  );
}
