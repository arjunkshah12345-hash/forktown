"use client";

import { useEffect, useRef } from "react";
import type { SampleDistrict } from "./sample-data";
import { COLS, KIND_ROOF, ROWS, TILE, TERRAIN } from "./pixel-engine";

export function PixelWarMap({
  districts,
  selectedId,
  pulseId,
}: {
  districts: SampleDistrict[];
  selectedId: string | null;
  pulseId?: string | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let frame = 0;
    let raf = 0;

    const draw = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(0, 0, w, h);

      const sx = w / COLS;
      const sy = h / ROWS;

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const t = TERRAIN[y][x];
          if (t === "water" || t === "bridge") ctx.fillStyle = "#2471A3";
          else if (t === "path") ctx.fillStyle = "#8D6E63";
          else ctx.fillStyle = (x + y) % 3 ? "#4A9030" : "#5FA838";
          ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
        }
      }

      for (const d of districts) {
        const stressed = d.health < 0.75 || d.load > 0.65;
        const pulse = pulseId === d.id && (frame >> 3) % 2 === 0;
        ctx.fillStyle = pulse ? "#FFD54F" : d.id === selectedId ? "#FFF" : KIND_ROOF[d.kind];
        ctx.fillRect(d.gx * sx, d.gy * sy, sx * 3.5, sy * 2.5);
        if (stressed) {
          ctx.fillStyle = "#EF5350";
          ctx.fillRect(d.gx * sx + sx, d.gy * sy - 2, 2, 2);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [districts, selectedId, pulseId]);

  return <canvas ref={ref} width={280} height={180} className="pixel-war-map" />;
}
