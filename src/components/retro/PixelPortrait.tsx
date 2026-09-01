"use client";

import { useEffect, useRef } from "react";

export function PixelPortrait({ type }: { type: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const draw = (tick: number) => {
      ctx.fillStyle = "#2c1810";
      ctx.fillRect(0, 0, 48, 48);

      const blink = tick % 120 > 115;
      const skin = "#FFCCBC";
      const hair = type === "agent" ? "#37474F" : type === "angry" ? "#5D4037" : "#4E342E";

      ctx.fillStyle = hair;
      ctx.fillRect(8, 6, 32, 12);
      ctx.fillStyle = skin;
      ctx.fillRect(10, 14, 28, 26);

      ctx.fillStyle = blink ? hair : "#1a1a1a";
      ctx.fillRect(14, 22, 4, blink ? 1 : 3);
      ctx.fillRect(28, 22, 4, blink ? 1 : 3);

      if (type === "angry") {
        ctx.fillStyle = "#E53935";
        ctx.fillRect(12, 18, 6, 2);
        ctx.fillRect(26, 18, 6, 2);
        ctx.fillRect(18, 32, 12, 3);
        ctx.fillStyle = "#FF8A65";
        ctx.fillRect(6, 20, 4, 4);
      } else if (type === "anxious") {
        ctx.fillStyle = "#5D4037";
        ctx.fillRect(13, 20, 5, 4);
        ctx.fillRect(27, 20, 5, 4);
        ctx.fillStyle = "#90CAF9";
        ctx.fillRect(32, 14, 3, 6);
        ctx.fillRect(34, 12, 2, 2);
      } else if (type === "agent") {
        ctx.fillStyle = "#29B6F6";
        ctx.fillRect(8, 8, 32, 8);
        ctx.fillStyle = "#00E5FF";
        ctx.fillRect(14, 20, 8, 4);
        ctx.fillRect(26, 20, 8, 4);
        ctx.fillStyle = "#37474F";
        ctx.fillRect(16, 34, 16, 6);
      } else if (type === "system") {
        ctx.fillStyle = "#FFD54F";
        ctx.fillRect(14, 10, 20, 20);
        ctx.fillStyle = "#FF6F00";
        for (let i = 0; i < 4; i++) {
          const a = (tick * 0.1 + i * 1.57);
          ctx.fillRect(24 + Math.cos(a) * 14, 20 + Math.sin(a) * 14, 3, 3);
        }
      } else {
        ctx.fillStyle = "#5D4037";
        ctx.fillRect(14, 20, 4, 3);
        ctx.fillRect(28, 20, 4, 3);
        ctx.fillRect(18, 30, 12, 2);
      }
    };

    let f = 0;
    let id = 0;
    const loop = () => {
      draw(f++);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [type]);

  return <canvas ref={ref} width={48} height={48} className="pixel-portrait-canvas" />;
}
