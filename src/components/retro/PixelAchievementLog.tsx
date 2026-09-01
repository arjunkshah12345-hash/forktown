"use client";

export function PixelAchievementLog({
  open,
  onClose,
  unlocked,
}: {
  open: boolean;
  onClose: () => void;
  unlocked: string[];
}) {
  const ALL = [
    { id: "first-enter", title: "TOWN ARRIVAL", sub: "Entered the pixel sample" },
    { id: "first-talk", title: "FIRST CONTACT", sub: "Spoke with a town mind" },
    { id: "mitigate", title: "DIPLOMAT", sub: "Offered dual-write to Mara" },
    { id: "survive", title: "SURVIVOR", sub: "Cleared a rehearsal alive" },
    { id: "level-2", title: "RISING AGENT", sub: "Reached agent level 2" },
  ];

  if (!open) return null;

  return (
    <div className="pixel-overlay" role="dialog" aria-modal onClick={onClose}>
      <div className="pixel-modal pixel-achieve-log" onClick={(e) => e.stopPropagation()}>
        <header className="pixel-modal-head">
          <h2>★ ACHIEVEMENTS</h2>
          <button type="button" className="pixel-btn pixel-btn-ghost" onClick={onClose}>
            ✕ J / ESC
          </button>
        </header>
        <ul className="pixel-achieve-list">
          {ALL.map((a) => {
            const on = unlocked.includes(a.id);
            return (
              <li key={a.id} className={on ? "on" : "off"}>
                <span className="pixel-achieve-icon">{on ? "★" : "☆"}</span>
                <div>
                  <p className="pixel-achieve-name">{on ? a.title : "???"}</p>
                  <p className="pixel-achieve-sub">{on ? a.sub : "Locked"}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="pixel-achieve-count">
          {unlocked.length} / {ALL.length} unlocked
        </p>
      </div>
    </div>
  );
}
