"use client";

import { useEffect, useRef, useState } from "react";
import type { SampleDistrict, SampleNpc } from "./sample-data";
import {
  COLS,
  ROWS,
  TILE,
  TERRAIN,
  drawAmbients,
  drawClouds,
  drawDecor,
  drawDistrictRoutes,
  dayPhaseLabel,
  drawEmotes,
  drawFlower,
  drawFloatTexts,
  drawFog,
  drawFootprints,
  drawFloatingBars,
  drawForgeAura,
  drawLightning,
  drawMailFloats,
  drawMinimap,
  drawNightLanterns,
  drawNpcNameTag,
  drawNpcSprite,
  drawParallaxHills,
  drawParticles,
  drawPetals,
  drawComboBanner,
  drawAgentTrail,
  drawFireworks,
  drawRain,
  drawRehearseFlash,
  drawRipples,
  drawSeasonTint,
  drawSelectionRing,
  drawSpeechBubble,
  drawStars,
  drawTile,
  drawTree,
  drawVoxelBuilding,
  drawWaterSparkles,
  hitMinimapDistrict,
  initAmbients,
  initNpcStates,
  initPetals,
  initRain,
  nudgeZoom,
  seasonName,
  shakeOffset,
  skyColors,
  spawnEmote,
  spawnFireworkBurst,
  spawnFloatText,
  spawnFootprint,
  spawnParticles,
  spawnRipple,
  steerAgentToDistrict,
  tickAmbients,
  tickEmotes,
  tickFireworks,
  tickFloatTexts,
  tickFootprints,
  tickMailFloats,
  tickNpcSchedule,
  tickParticles,
  tickPetals,
  tickRain,
  tickRipples,
  updateCamera,
  type Ambient,
  type Camera,
  type Emote,
  type Firework,
  type FloatText,
  type Footprint,
  type MailFloat,
  type NpcState,
  type Particle,
  type Petal,
  type RainDrop,
  type Ripple,
} from "./pixel-engine";

export function PixelTownCanvas({
  districts,
  npcs,
  selectedId,
  onSelect,
  pulseDistrict,
  shake = 0,
  rehearseFlash = 0,
  rain = false,
  rehearseProgress = 0,
  onBlip,
  onDayPhase,
  onNpcClick,
  onSeason,
  combo = 0,
  ambientRain = false,
  speed = 1,
  celebrate = false,
  paused = false,
}: {
  districts: SampleDistrict[];
  npcs: SampleNpc[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  pulseDistrict?: string | null;
  shake?: number;
  rehearseFlash?: number;
  rain?: boolean;
  rehearseProgress?: number;
  onBlip?: () => void;
  onDayPhase?: (phase: string, day: number) => void;
  onNpcClick?: (name: string) => void;
  onSeason?: (season: string) => void;
  combo?: number;
  ambientRain?: boolean;
  speed?: number;
  celebrate?: boolean;
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const npcRef = useRef<NpcState[]>(initNpcStates(npcs));
  const ambientsRef = useRef<Ambient[]>(initAmbients());
  const particlesRef = useRef<Particle[]>([]);
  const rainRef = useRef<RainDrop[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const floatTextsRef = useRef<FloatText[]>([]);
  const mailRef = useRef<MailFloat[]>([]);
  const footprintsRef = useRef<Footprint[]>([]);
  const emotesRef = useRef<Emote[]>([]);
  const petalsRef = useRef<Petal[]>(initPetals(16));
  const fireworksRef = useRef<Firework[]>([]);
  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const rainOnRef = useRef(rain || ambientRain);
  const pulseRef = useRef(pulseDistrict);
  const selectedRef = useRef(selectedId);
  const shakeRef = useRef(shake);
  const flashRef = useRef(rehearseFlash);
  const comboRef = useRef(combo);
  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  const lastMilestoneRef = useRef(0);
  const lastFpRef = useRef<Record<string, number>>({});
  const dayPhaseCb = useRef(onDayPhase);
  dayPhaseCb.current = onDayPhase;
  const seasonCb = useRef(onSeason);
  seasonCb.current = onSeason;
  comboRef.current = combo;
  speedRef.current = speed;
  pausedRef.current = paused;

  const [hover, setHover] = useState<{
    name: string;
    x: number;
    y: number;
    kind: string;
    hp: number;
  } | null>(null);

  useEffect(() => {
    pulseRef.current = pulseDistrict;
    if (pulseDistrict) {
      const d = districts.find((x) => x.id === pulseDistrict);
      if (d) for (let i = 0; i < 8; i++) spawnParticles(particlesRef.current, d, "spark");
    }
  }, [pulseDistrict, districts]);

  useEffect(() => {
    rainOnRef.current = rain || ambientRain;
    if ((rain || ambientRain) && rainRef.current.length === 0) {
      rainRef.current = initRain(rain ? 80 : 36, COLS * TILE, ROWS * TILE);
    }
    if (!rain && !ambientRain) rainRef.current = [];
  }, [rain, ambientRain]);

  useEffect(() => {
    if (!celebrate) return;
    const w = COLS * TILE;
    spawnFireworkBurst(fireworksRef.current, w * 0.3, 40);
    spawnFireworkBurst(fireworksRef.current, w * 0.55, 55);
    spawnFireworkBurst(fireworksRef.current, w * 0.75, 35);
  }, [celebrate]);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    shakeRef.current = shake;
    flashRef.current = rehearseFlash;
  }, [shake, rehearseFlash]);

  useEffect(() => {
    const milestones = [
      { at: 25, text: "SCANNING", color: "#81D4FA" },
      { at: 50, text: "NEGOTIATING", color: "#FFD54F" },
      { at: 75, text: "+TRUST", color: "#A5D6A7" },
      { at: 100, text: "SURVIVED!", color: "#FFD54F" },
    ];
    for (const m of milestones) {
      if (rehearseProgress >= m.at && lastMilestoneRef.current < m.at) {
        lastMilestoneRef.current = m.at;
        const d = districts.find((x) => x.id === selectedRef.current) ?? districts[0];
        if (d) {
          spawnFloatText(
            floatTextsRef.current,
            d.gx * TILE + TILE * 2,
            d.gy * TILE - 20,
            m.text,
            m.color,
          );
        }
      }
    }
    if (rehearseProgress === 0) lastMilestoneRef.current = 0;
  }, [rehearseProgress, districts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const resize = () => {
      const maxW = wrap.clientWidth - 8;
      const scale = Math.max(2, Math.floor(maxW / (COLS * TILE)));
      canvas.style.width = `${COLS * TILE * scale}px`;
      canvas.style.height = `${ROWS * TILE * scale}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let frame = 0;
    let raf = 0;

    const render = () => {
      const frozen = pausedRef.current;
      if (!frozen) frame++;
      const w = COLS * TILE;
      const h = ROWS * TILE;

      const sky = skyColors(frame);
      const nightLevel = 1 - sky.day;

      if (!frozen) {
        tickNpcSchedule(npcRef.current, districts, nightLevel, 0.018 * speedRef.current);
        for (const n of npcRef.current) {
          const last = lastFpRef.current[n.id] ?? 0;
          if (frame - last > Math.max(4, 10 / speedRef.current)) {
            spawnFootprint(footprintsRef.current, n.wx * TILE + 6, n.wy * TILE + 14, n.dir);
            lastFpRef.current[n.id] = frame;
          }
        }
        tickFootprints(footprintsRef.current);
        tickEmotes(emotesRef.current);
        tickPetals(petalsRef.current, w, h, frame);
        tickAmbients(ambientsRef.current, w, h);
        tickParticles(particlesRef.current);
        tickFireworks(fireworksRef.current);
        if (rainOnRef.current) tickRain(rainRef.current, w, h);
        tickRipples(ripplesRef.current);
        tickFloatTexts(floatTextsRef.current);
        tickMailFloats(mailRef.current, 3, 6, frame);

        if (frame % 70 === 0) {
          const n = npcRef.current[frame % npcRef.current.length];
          if (n) {
            const kind =
              n.mood === "angry"
                ? "anger"
                : n.mood === "anxious"
                  ? "think"
                  : n.role === "Agent"
                    ? "spark"
                    : "heart";
            spawnEmote(emotesRef.current, n, kind);
          }
        }
      }

      const sel = districts.find((d) => d.id === selectedRef.current) ?? null;
      if (!frozen) {
        updateCamera(
          camRef.current,
          sel ? { x: sel.gx * TILE + TILE * 2, y: sel.gy * TILE + TILE } : null,
          w,
          h,
        );
        steerAgentToDistrict(npcRef.current, sel);
      }

      if (!frozen) {
        const stressed = districts.filter((d) => d.health < 0.75 || d.load > 0.65);
        if (frame % 90 === 0 && stressed.length) {
          const d = stressed[frame % stressed.length];
          spawnParticles(particlesRef.current, d, d.load > 0.65 ? "anger" : "smoke");
        }
      }

      const sh = frozen ? { x: 0, y: 0 } : shakeOffset(shakeRef.current, frame);
      const z = camRef.current.zoom || 1;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(z, z);
      ctx.translate(-w / 2 + sh.x + camRef.current.x, -h / 2 + sh.y + camRef.current.y);

      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
      grad.addColorStop(0, sky.sky1);
      grad.addColorStop(1, sky.sky2);
      ctx.fillStyle = grad;
      ctx.fillRect(-40, 0, w + 80, h * 0.38);
      ctx.fillStyle = sky.grass;
      ctx.fillRect(-40, h * 0.38, w + 80, h);

      drawParallaxHills(ctx, w, h, frame, nightLevel);
      drawStars(ctx, frame, nightLevel);
      drawClouds(ctx, frame, nightLevel);
      drawFog(ctx, w, h, frame, sky.day);
      drawAmbients(ctx, ambientsRef.current, frame);

      if (!frozen && frame % 30 === 0) {
        dayPhaseCb.current?.(dayPhaseLabel(sky.day), sky.day);
        seasonCb.current?.(seasonName(frame));
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          drawTile(ctx, x, y, TERRAIN[y][x], frame, sky.grass);
        }
      }

      drawWaterSparkles(ctx, frame);
      drawDecor(ctx, frame);
      drawDistrictRoutes(ctx, districts, frame, selectedRef.current);
      drawFootprints(ctx, footprintsRef.current);
      drawPetals(ctx, petalsRef.current);

      drawTree(ctx, 1, 4, frame);
      drawTree(ctx, 28, 3, frame);
      drawTree(ctx, 29, 17, frame);
      drawTree(ctx, 2, 17, frame);
      drawFlower(ctx, 12, 11, frame);
      drawFlower(ctx, 17, 8, frame);
      drawFlower(ctx, 7, 14, frame);

      const sorted = [...districts].sort((a, b) => a.gy - b.gy || a.gx - b.gx);
      for (const d of sorted) {
        drawVoxelBuilding(ctx, d, frame, selectedRef.current, nightLevel);
        if (d.id === selectedRef.current) drawSelectionRing(ctx, d, frame);
      }

      drawNightLanterns(ctx, districts, nightLevel, frame);

      const forge = npcRef.current.find((n) => n.id === "n0") ?? null;
      drawAgentTrail(ctx, forge, sel, frame);
      drawFloatingBars(ctx, districts, frame);

      const sortedNpcs = [...npcRef.current].sort((a, b) => a.wy - b.wy);
      for (const n of sortedNpcs) {
        if (n.role === "Agent") drawForgeAura(ctx, n, frame);
        drawNpcSprite(ctx, n, frame);
        drawSpeechBubble(ctx, n, frame);
        drawNpcNameTag(ctx, n);
      }

      drawEmotes(ctx, emotesRef.current);
      drawParticles(ctx, particlesRef.current);
      drawMailFloats(ctx, mailRef.current);
      drawFloatTexts(ctx, floatTextsRef.current);
      if (rainOnRef.current) {
        drawRain(ctx, rainRef.current);
        drawLightning(ctx, w, h, frame, true);
      }
      drawRipples(ctx, ripplesRef.current);
      drawMinimap(ctx, districts, selectedRef.current, npcRef.current);
      drawRehearseFlash(ctx, w, h, flashRef.current);
      drawComboBanner(ctx, w, comboRef.current, frame);
      drawSeasonTint(ctx, w, h, frame);
      drawFireworks(ctx, fireworksRef.current);

      if (pulseRef.current) {
        const d = districts.find((x) => x.id === pulseRef.current);
        if (d && frame % 20 === 0) spawnParticles(particlesRef.current, d, "spark");
      }

      ctx.restore();
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [districts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      nudgeZoom(camRef.current, e.deltaY > 0 ? -0.08 : 0.08);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "=" || e.key === "+") nudgeZoom(camRef.current, 0.1);
      if (e.key === "-" || e.key === "_") nudgeZoom(camRef.current, -0.1);
      if (e.key === "0") camRef.current.zoom = 1;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pointerPos(e: React.MouseEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cam = camRef.current;
    const z = cam.zoom || 1;
    const w = canvas.width;
    const h = canvas.height;
    const sx = ((e.clientX - rect.left) / rect.width) * w;
    const sy = ((e.clientY - rect.top) / rect.height) * h;
    return {
      cx: (sx - w / 2) / z + w / 2 - cam.x,
      cy: (sy - h / 2) / z + h / 2 - cam.y,
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
    };
  }

  function hitNpc(cx: number, cy: number) {
    return [...npcRef.current].reverse().find((n) => {
      const x = n.wx * TILE;
      const y = n.wy * TILE - 4;
      return cx >= x && cx <= x + 14 && cy >= y && cy <= y + 20;
    });
  }

  function hitDistrict(cx: number, cy: number) {
    return districts.find((d) => {
      const bx = d.gx * TILE;
      const by = d.gy * TILE - 32;
      return cx >= bx - 4 && cx <= bx + 4 * TILE + 4 && cy >= by - 8 && cy <= by + 3 * TILE + 24;
    });
  }

  return (
    <div
      ref={wrapRef}
      className={`pixel-scene relative ${shake > 0 && !paused ? "pixel-scene-shake" : ""} ${paused ? "is-paused" : ""}`}
    >
      <canvas
        ref={canvasRef}
        width={COLS * TILE}
        height={ROWS * TILE}
        className="pixel-canvas mx-auto block"
        onClick={(e) => {
          const { cx, cy } = pointerPos(e);
          spawnRipple(ripplesRef.current, cx, cy);
          onBlip?.();
          const mapHit = hitMinimapDistrict(districts, cx, cy);
          if (mapHit) {
            onSelect(mapHit.id);
            return;
          }
          const n = hitNpc(cx, cy);
          if (n) {
            onNpcClick?.(n.name);
            return;
          }
          const d = hitDistrict(cx, cy);
          if (d) onSelect(d.id);
        }}
        onMouseMove={(e) => {
          const { cx, cy, px, py } = pointerPos(e);
          const n = hitNpc(cx, cy);
          if (n) {
            setHover({ name: n.name, x: px, y: py, kind: n.role, hp: 100 });
            return;
          }
          const d = hitDistrict(cx, cy);
          setHover(
            d
              ? { name: d.name, x: px, y: py, kind: d.kind, hp: Math.round(d.health * 100) }
              : null,
          );
        }}
        onMouseLeave={() => setHover(null)}
      />
      {paused && <div className="pixel-scene-frozen">⏸ FROZEN</div>}
      {hover && (
        <div
          className="pixel-tooltip pointer-events-none absolute z-20"
          style={{ left: hover.x + 14, top: hover.y - 10 }}
        >
          <strong>{hover.name}</strong>
          <span className="pixel-tooltip-kind">
            {hover.kind} · HP {hover.hp}%
          </span>
        </div>
      )}
    </div>
  );
}
