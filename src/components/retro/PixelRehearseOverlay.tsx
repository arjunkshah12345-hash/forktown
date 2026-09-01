"use client";

export function PixelRehearseOverlay({
  active,
  progress,
  label,
}: {
  active: boolean;
  progress: number;
  label: string;
}) {
  if (!active) return null;

  const step =
    progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : progress < 95 ? 3 : 4;
  const steps = ["WAKE", "PRESSURE", "NEGOTIATE", "JUDGE", "DONE"];

  return (
    <div className="pixel-rehearse-overlay" aria-live="polite">
      <div className="pixel-rehearse-box">
        <p className="pixel-rehearse-label">{label}</p>
        <ol className="pixel-rehearse-steps">
          {steps.map((s, i) => (
            <li key={s} className={i < step ? "done" : i === step ? "active" : ""}>
              {s}
            </li>
          ))}
        </ol>
        <div className="pixel-rehearse-track">
          <div className="pixel-rehearse-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="pixel-rehearse-pct">{Math.round(progress)}%</p>
        <p className="pixel-rehearse-sub">
          {progress < 30 && "Waking subjective minds…"}
          {progress >= 30 && progress < 60 && "Pressure layers attacking…"}
          {progress >= 60 && progress < 90 && "Agent negotiating with town…"}
          {progress >= 90 && "Judging survivability…"}
        </p>
      </div>
    </div>
  );
}
