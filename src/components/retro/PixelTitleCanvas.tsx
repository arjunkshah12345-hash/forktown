"use client";

import { useEffect, useRef } from "react";
import { COLS, PAL, ROWS, TILE, drawClouds, drawTile, drawTree, drawVoxelBuilding, skyColors } from "./pixel-engine";
import { SAMPLE_DISTRICTS } from "./sample-data";

/** Animated town preview for the title screen */
export function PixelTitleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const districts = SAMPLE_DISTRICTS.slice(0, 8);
    let frame = 0;
    let raf = 0;

    const terrain = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) => {
        if (x > 22 && y > 10 && y < 15) return "water" as const;
        if (y === 10) return "path" as const;
        return (x + y) % 5 === 0 ? ("grass2" as const) : ("grass" as const);
      }),
    );

    const loop = () => {
      frame++;
      const sky = skyColors(frame * 0.5);
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      grad.addColorStop(0, sky.sky1);
      grad.addColorStop(1, sky.sky2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h * 0.42);
      ctx.fillStyle = sky.grass;
      ctx.fillRect(0, h * 0.42, w, h);

      drawClouds(ctx, frame, 1 - sky.day);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          drawTile(ctx, x, y, terrain[y][x], frame, sky.grass);
        }
      }

      drawTree(ctx, 2, 5, frame);
      drawTree(ctx, 27, 4, frame);
      drawTree(ctx, 28, 16, frame);

      const sorted = [...districts].sort((a, b) => a.gy - b.gy);
      const highlight = districts[frame % districts.length]?.id ?? null;
      for (const d of sorted) drawVoxelBuilding(ctx, d, frame, highlight);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={COLS * TILE}
      height={ROWS * TILE}
      className="pixel-title-canvas"
      aria-hidden
    />
  );
}
