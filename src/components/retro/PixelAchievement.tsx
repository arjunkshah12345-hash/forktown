"use client";

export function PixelAchievement({
  show,
  title,
  subtitle,
  onDone,
}: {
  show: boolean;
  title: string;
  subtitle: string;
  onDone?: () => void;
}) {
  if (!show) return null;

  return (
    <div
      className="pixel-achievement"
      onAnimationEnd={(e) => {
        if (e.animationName === "achieve-out" && onDone) onDone();
      }}
    >
      <div className="pixel-achievement-burst" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <div className="pixel-achievement-stars" aria-hidden>
        {["★", "✦", "★", "✦", "★"].map((s, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.1}s` }}>
            {s}
          </span>
        ))}
      </div>
      <p className="pixel-achievement-title">{title}</p>
      <p className="pixel-achievement-sub">{subtitle}</p>
    </div>
  );
}
