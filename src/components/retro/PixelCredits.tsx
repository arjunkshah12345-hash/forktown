"use client";

export function PixelCredits({
  open,
  onClose,
  survivability,
}: {
  open: boolean;
  onClose: () => void;
  survivability: number;
}) {
  if (!open) return null;

  return (
    <div className="pixel-overlay pixel-credits-overlay" role="dialog" aria-modal>
      <div className="pixel-credits">
        <p className="pixel-credits-eyebrow">FORKTOWN · PIXEL SAMPLE</p>
        <h2 className="pixel-credits-title">REHEARSAL SURVIVED</h2>
        <p className="pixel-credits-stat">{survivability.toFixed(1)}%</p>
        <ul className="pixel-credits-roll">
          <li>Engine · subjective minds</li>
          <li>Prospect theory · memory · affect</li>
          <li>Agent · Forge</li>
          <li>Town · Invoice Barn cohort</li>
          <li>Where agents rehearse before they ship</li>
        </ul>
        <button type="button" className="pixel-btn pixel-btn-primary" onClick={onClose}>
          ▶ CONTINUE
        </button>
      </div>
    </div>
  );
}
