import type { SampleDistrict, SampleNpc } from "./sample-data";

export const TILE = 16;
export const COLS = 32;
export const ROWS = 22;

export const PAL = {
  sky1: "#87CEEB",
  sky2: "#6BB5FF",
  skyNight1: "#1a237e",
  skyNight2: "#283593",
  grass1: "#7EC850",
  grass2: "#5FA838",
  grass3: "#4A9030",
  grassNight: "#3D6B32",
  dirt: "#C4A035",
  dirtDark: "#8B6914",
  water1: "#5DADE2",
  water2: "#3498DB",
  water3: "#2471A3",
  path: "#E8C872",
  pathEdge: "#B8956A",
  shadow: "rgba(15,25,15,0.35)",
  cloud: "#FDFEFF",
  cloudNight: "#5C6BC0",
  tree: "#2E7D32",
  treeHi: "#66BB6A",
  trunk: "#5D4037",
  fence: "#A1887F",
  roofRed: "#E74C3C",
  roofBlue: "#3498DB",
  roofGreen: "#27AE60",
  roofPurple: "#9B59B6",
  roofOrange: "#E67E22",
  roofDark: "#34495E",
  wall: "#F5E6CA",
  wallDark: "#D7C4A3",
  window: "#FFF59D",
  windowLit: "#FFE082",
  smoke: "#B0BEC5",
  gold: "#FFD54F",
  heart: "#EF5350",
  star: "#FFEE58",
};

export const KIND_ROOF: Record<SampleDistrict["kind"], string> = {
  billing: PAL.roofOrange,
  auth: PAL.roofBlue,
  api: PAL.roofGreen,
  data: PAL.roofPurple,
  support: PAL.roofRed,
  finance: PAL.roofOrange,
  security: PAL.roofDark,
  edge: PAL.roofBlue,
};

export type Terrain = "grass" | "grass2" | "water" | "path" | "dirt" | "bridge";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: "heart" | "anger" | "spark" | "smoke";
  color: string;
};

export type NpcState = SampleNpc & {
  wx: number;
  wy: number;
  path: { x: number; y: number }[];
  pathIdx: number;
  dir: 0 | 1 | 2 | 3;
  frame: number;
};

function buildTerrain(): Terrain[][] {
  const map: Terrain[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => "grass" as Terrain),
  );

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if ((x * 3 + y * 7) % 11 === 0) map[y][x] = "grass2";
      if (x > 22 && y > 10 && y < 15) map[y][x] = "water";
      if (y === 14 && x > 21 && x < 27) map[y][x] = "bridge";
      if (x >= 10 && x <= 14 && y >= 15 && y <= 16) map[y][x] = "dirt";
    }
  }

  const pathY = 10;
  for (let x = 1; x < COLS - 1; x++) {
    map[pathY][x] = "path";
    if (x % 7 === 0 && pathY + 1 < ROWS) map[pathY + 1][x] = "path";
  }
  for (let y = 6; y < 18; y++) {
    if (y % 5 === 0) map[y][15] = "path";
  }

  return map;
}

export const TERRAIN = buildTerrain();

export function initNpcStates(npcs: SampleNpc[]): NpcState[] {
  const paths: Record<string, { x: number; y: number }[]> = {
    n0: [
      { x: 10, y: 8 },
      { x: 12, y: 10 },
      { x: 14, y: 10 },
      { x: 12, y: 8 },
    ],
    n1: [
      { x: 5, y: 11 },
      { x: 7, y: 10 },
      { x: 8, y: 12 },
      { x: 6, y: 13 },
    ],
    n2: [
      { x: 20, y: 7 },
      { x: 22, y: 10 },
      { x: 19, y: 11 },
      { x: 18, y: 8 },
    ],
    n3: [
      { x: 16, y: 12 },
      { x: 18, y: 14 },
      { x: 15, y: 15 },
      { x: 14, y: 13 },
    ],
  };

  return npcs.map((n) => ({
    ...n,
    wx: n.gx,
    wy: n.gy,
    path: paths[n.id] ?? [{ x: n.gx, y: n.gy }],
    pathIdx: 0,
    dir: 2,
    frame: 0,
  }));
}

export function tickNpcs(states: NpcState[], speed = 0.018): void {
  for (const n of states) {
    const target = n.path[n.pathIdx];
    const dx = target.x - n.wx;
    const dy = target.y - n.wy;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.04) {
      n.pathIdx = (n.pathIdx + 1) % n.path.length;
      n.frame++;
    } else {
      n.wx += (dx / dist) * speed;
      n.wy += (dy / dist) * speed;
      if (Math.abs(dx) > Math.abs(dy)) n.dir = dx > 0 ? 3 : 1;
      else n.dir = dy > 0 ? 2 : 0;
    }
  }
}

export function skyColors(t: number) {
  const day = (Math.sin(t * 0.015) + 1) / 2;
  return {
    day,
    sky1: lerpColor(PAL.skyNight1, PAL.sky1, day),
    sky2: lerpColor(PAL.skyNight2, PAL.sky2, day),
    grass: lerpColor(PAL.grassNight, PAL.grass1, day),
  };
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hex(h: string) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  terrain: Terrain,
  tick: number,
  grassColor: string,
) {
  const x = tx * TILE;
  const y = ty * TILE;
  const v = (tx * 7 + ty * 13) % 4;

  if (terrain === "water") {
    const wave = Math.sin(tick * 0.05 + tx * 0.4 + ty * 0.25);
    ctx.fillStyle = wave > 0.2 ? PAL.water1 : PAL.water2;
    ctx.fillRect(x, y, TILE, TILE);
    if (v === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + 3 + ((tick >> 2) % 4), y + 5, 4, 1);
    }
    return;
  }

  if (terrain === "bridge") {
    ctx.fillStyle = PAL.water2;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#8D6E63";
    ctx.fillRect(x, y + 5, TILE, 6);
    ctx.fillStyle = "#6D4C41";
    ctx.fillRect(x + 2, y + 6, 2, 4);
    ctx.fillRect(x + 12, y + 6, 2, 4);
    return;
  }

  if (terrain === "path") {
    ctx.fillStyle = PAL.path;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = PAL.pathEdge;
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
    if (v === 2) {
      ctx.fillStyle = PAL.dirtDark;
      ctx.fillRect(x + 5, y + 4, 2, 2);
    }
    return;
  }

  if (terrain === "dirt") {
    ctx.fillStyle = PAL.dirt;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = PAL.dirtDark;
    ctx.fillRect(x + 2, y + 2, 5, 5);
    ctx.fillRect(x + 9, y + 8, 3, 3);
    return;
  }

  ctx.fillStyle = terrain === "grass2" ? PAL.grass2 : v === 3 ? PAL.grass3 : grassColor;
  ctx.fillRect(x, y, TILE, TILE);
  if (v === 1) {
    ctx.fillStyle = PAL.grass2;
    ctx.fillRect(x + 11, y + 9, 2, 2);
    ctx.fillRect(x + 3, y + 5, 2, 2);
  }
}

export function drawVoxelBuilding(
  ctx: CanvasRenderingContext2D,
  d: SampleDistrict,
  tick: number,
  selected: string | null,
  nightLevel = 0,
) {
  const bx = d.gx * TILE;
  const by = d.gy * TILE;
  const roof = KIND_ROOF[d.kind];
  const stressed = d.health < 0.75 || d.load > 0.65;
  const sel = selected === d.id;
  const w = 4;
  const h = 3;

  ctx.fillStyle = PAL.shadow;
  ctx.fillRect(bx + 6, by + 8, w * TILE - 4, 5);

  switch (d.kind) {
    case "edge":
      drawWindmill(ctx, bx, by, tick, roof, stressed);
      break;
    case "security":
      drawTower(ctx, bx, by, roof, stressed);
      break;
    case "api":
      drawPier(ctx, bx, by, roof);
      break;
    case "data":
      drawSilo(ctx, bx, by, roof);
      break;
    default:
      drawHouse(ctx, bx, by, w, h, roof, stressed, tick, d.kind, nightLevel);
  }

  if (stressed) drawSmoke(ctx, bx + w * TILE - 8, by - 4, tick);
  if (sel) drawSelection(ctx, bx - 2, by - 16, w * TILE + 4, h * TILE + 22, tick);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 5px monospace";
  ctx.textAlign = "center";
  ctx.fillText(d.name.split(" ")[0].toUpperCase(), bx + (w * TILE) / 2, by + h * TILE + 12);
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  w: number,
  h: number,
  roof: string,
  stressed: boolean,
  tick: number,
  kind: SampleDistrict["kind"],
  nightLevel = 0,
) {
  for (let layer = 0; layer < h; layer++) {
    for (let col = 0; col < w; col++) {
      const px = bx + col * TILE;
      const py = by - layer * TILE;
      const side = col === 0;
      ctx.fillStyle = side ? PAL.wallDark : layer % 2 ? PAL.wallDark : PAL.wall;
      ctx.fillRect(px, py, TILE, TILE);
      if (layer === 0 && col === 1) {
        const lit = nightLevel > 0.45;
        ctx.fillStyle =
          stressed && (tick >> 4) % 2 ? "#FF7043" : lit ? PAL.windowLit : PAL.window;
        ctx.fillRect(px + 3, py + 4, 10, 8);
        ctx.fillStyle = "#8D6E63";
        ctx.fillRect(px + 7, py + 4, 2, 8);
        if (lit && (tick >> 3) % 5 === 0) {
          ctx.fillStyle = "rgba(255,224,130,0.4)";
          ctx.fillRect(px + 1, py + 2, 14, 12);
        }
      }
      if (layer === 0 && col === 2 && kind === "support") {
        ctx.fillStyle = "#795548";
        ctx.fillRect(px + 10, py + 8, 4, 8);
      }
    }
  }
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(bx - 3, by + 2);
  ctx.lineTo(bx + (w * TILE) / 2, by - 12);
  ctx.lineTo(bx + w * TILE + 3, by + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(roof, -20);
  ctx.fillRect(bx + w * TILE - 4, by - 8, 4, 10);
}

function drawWindmill(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  tick: number,
  roof: string,
  stressed: boolean,
) {
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(bx + 8, by - 24, 16, 32);
  ctx.fillStyle = roof;
  ctx.fillRect(bx + 6, by - 30, 20, 8);
  const angle = tick * 0.08;
  const cx = bx + 16;
  const cy = by - 10;
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI) / 2;
    ctx.fillStyle = stressed ? "#EF5350" : "#ECF0F1";
    ctx.fillRect(cx + Math.cos(a) * 14 - 2, cy + Math.sin(a) * 14 - 2, 4, 4);
    ctx.fillRect(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, Math.cos(a) * 10, Math.sin(a) * 10);
  }
}

function drawTower(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  roof: string,
  stressed: boolean,
) {
  ctx.fillStyle = PAL.wallDark;
  ctx.fillRect(bx + 10, by - 32, 12, 40);
  ctx.fillStyle = roof;
  ctx.fillRect(bx + 8, by - 38, 16, 8);
  ctx.fillStyle = stressed ? "#FF5722" : PAL.windowLit;
  ctx.fillRect(bx + 13, by - 20, 6, 6);
}

function drawPier(ctx: CanvasRenderingContext2D, bx: number, by: number, roof: string) {
  ctx.fillStyle = "#8D6E63";
  for (let i = 0; i < 4; i++) ctx.fillRect(bx + i * 10, by + 8, 8, 4);
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(bx + 4, by - 8, 24, 16);
  ctx.fillStyle = roof;
  ctx.fillRect(bx + 2, by - 14, 28, 6);
}

function drawSilo(ctx: CanvasRenderingContext2D, bx: number, by: number, roof: string) {
  ctx.fillStyle = "#BDBDBD";
  ctx.fillRect(bx + 8, by - 28, 16, 36);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.arc(bx + 16, by - 28, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PAL.window;
  ctx.fillRect(bx + 13, by - 12, 6, 6);
}

function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const off = (tick >> 2) % 12;
  ctx.fillStyle = PAL.smoke;
  ctx.fillRect(x, y - off, 4, 4);
  ctx.fillRect(x + 3, y - off - 6, 3, 3);
  ctx.fillRect(x - 2, y - off - 10, 2, 2);
}

function drawSelection(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tick: number) {
  const flash = (tick >> 3) % 2 === 0;
  ctx.strokeStyle = flash ? PAL.gold : "#FFF";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -tick * 0.5;
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
}

function shade(hex: string, amt: number): string {
  const c = parseInt(hex.slice(1), 16);
  let r = ((c >> 16) & 255) + amt;
  let g = ((c >> 8) & 255) + amt;
  let b = (c & 255) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

export function drawNpcSprite(
  ctx: CanvasRenderingContext2D,
  n: NpcState,
  tick: number,
) {
  const step = Math.floor(tick / 8) % 2;
  const bob = step && n.path.length > 1 ? 1 : 0;
  const x = n.wx * TILE + 4;
  const y = n.wy * TILE + bob;
  const body = n.color;

  ctx.fillStyle = "#FFCCBC";
  ctx.fillRect(x + 2, y - 2, 8, 7);
  ctx.fillStyle = "#4E342E";
  ctx.fillRect(x + 2, y - 2, 8, 3);
  if (n.dir === 1) ctx.fillRect(x + 1, y + 1, 2, 2);
  if (n.dir === 3) ctx.fillRect(x + 9, y + 1, 2, 2);

  ctx.fillStyle = body;
  ctx.fillRect(x + 1, y + 5, 10, 9);
  ctx.fillStyle = "#3E2723";
  const legOff = step ? 1 : 0;
  ctx.fillRect(x + 2 + legOff, y + 14, 3, 4);
  ctx.fillRect(x + 7 - legOff, y + 14, 3, 4);

  if (n.mood === "angry") {
    ctx.fillStyle = PAL.heart;
    ctx.fillRect(x + 11, y - 4, 3, 3);
    if ((tick >> 2) % 3 === 0) {
      ctx.fillStyle = "#FF8A65";
      ctx.fillRect(x + 12, y - 8, 2, 2);
    }
  } else if (n.mood === "anxious") {
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(x + 11, y - 3, 2, 2);
    ctx.fillRect(x + 13, y - 5, 2, 2);
  }

  if (n.role === "Agent") {
    ctx.fillStyle = "#29B6F6";
    ctx.fillRect(x + 4, y + 7, 4, 3);
  }
}

export function drawNpcNameTag(ctx: CanvasRenderingContext2D, n: NpcState) {
  const x = n.wx * TILE + 9;
  const y = n.wy * TILE - 10;
  const label = n.name.split(" ")[0];
  const w = label.length * 4 + 6;
  ctx.fillStyle = "rgba(26,18,12,0.85)";
  ctx.fillRect(x - w / 2, y, w, 8);
  ctx.strokeStyle = n.mood === "angry" ? PAL.heart : n.role === "Agent" ? "#29B6F6" : "#8D6E63";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y, w, 8);
  ctx.fillStyle = "#FFF8E7";
  ctx.font = "4px monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 6);
}

const SPEECH_LINES: Record<string, string[]> = {
  "Mara K.": ["coupons!!", "not again"],
  Forge: ["dual-write on", "trust ↑"],
  "Devon SRE": ["retries 3x", "page?"],
  "Priya PM": ["ship fri?", "scope…"],
};

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  n: NpcState,
  tick: number,
) {
  const lines = SPEECH_LINES[n.name];
  if (!lines) return;
  if ((tick + n.gx * 17) % 240 > 50) return;
  const text = lines[(Math.floor(tick / 60) + n.gx) % lines.length];
  const x = n.wx * TILE + 6;
  const y = n.wy * TILE - 18;
  const w = text.length * 4 + 8;
  ctx.fillStyle = "#FFF8E7";
  ctx.fillRect(x, y, w, 10);
  ctx.strokeStyle = "#3E2723";
  ctx.strokeRect(x, y, w, 10);
  ctx.fillStyle = "#3E2723";
  ctx.font = "4px monospace";
  ctx.textAlign = "left";
  ctx.fillText(text, x + 3, y + 7);
  ctx.fillRect(x + 4, y + 10, 4, 3);
}

export type RainDrop = { x: number; y: number; speed: number; len: number };

export function initRain(count: number, w: number, h: number): RainDrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: 2 + Math.random() * 3,
    len: 4 + Math.random() * 6,
  }));
}

export function tickRain(drops: RainDrop[], w: number, h: number) {
  for (const d of drops) {
    d.y += d.speed;
    d.x += 0.5;
    if (d.y > h) {
      d.y = -d.len;
      d.x = Math.random() * w;
    }
  }
}

export function drawRain(ctx: CanvasRenderingContext2D, drops: RainDrop[]) {
  ctx.strokeStyle = "rgba(174,198,255,0.55)";
  ctx.lineWidth = 1;
  for (const d of drops) {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + 2, d.y + d.len);
    ctx.stroke();
  }
}

export type Ripple = { x: number; y: number; r: number; life: number };

export type FloatText = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
};

export function spawnFloatText(list: FloatText[], x: number, y: number, text: string, color: string) {
  list.push({ x, y, text, color, life: 55, vy: -0.35 });
}

export function tickFloatTexts(list: FloatText[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].y += list[i].vy;
    list[i].life--;
    if (list[i].life <= 0) list.splice(i, 1);
  }
}

export function drawFloatTexts(ctx: CanvasRenderingContext2D, list: FloatText[]) {
  for (const f of list) {
    ctx.globalAlpha = Math.min(1, f.life / 20);
    ctx.fillStyle = f.color;
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

export type MailFloat = { x: number; y: number; vy: number; frame: number };

export function tickMailFloats(list: MailFloat[], originGx: number, originGy: number, tick: number) {
  if (tick % 120 === 0) {
    list.push({
      x: originGx * TILE + 8 + Math.random() * 16,
      y: originGy * TILE,
      vy: -0.25 - Math.random() * 0.15,
      frame: 0,
    });
  }
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].y += list[i].vy;
    list[i].frame++;
    if (list[i].y < originGy * TILE - 40) list.splice(i, 1);
  }
}

export function drawMailFloats(ctx: CanvasRenderingContext2D, list: MailFloat[]) {
  for (const m of list) {
    ctx.fillStyle = "#FFF8E7";
    ctx.fillRect(m.x, m.y, 6, 4);
    ctx.fillStyle = "#E53935";
    ctx.fillRect(m.x + 5, m.y - 2, 3, 3);
  }
}

export function drawParallaxHills(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number, night: number) {
  const base = night > 0.4 ? "#2E4A2E" : "#5FA838";
  const front = night > 0.4 ? "#1B331B" : "#4A9030";
  for (let layer = 0; layer < 3; layer++) {
    const parallax = (tick * (0.02 + layer * 0.01)) % w;
    ctx.fillStyle = layer === 2 ? front : base;
    const hillH = 28 + layer * 12;
    const y = h * 0.38 - hillH + layer * 8;
    ctx.beginPath();
    ctx.moveTo(-parallax, y + hillH);
    for (let x = -parallax; x < w + 50; x += 40) {
      const peak = y + (layer % 2 ? 8 : 14);
      ctx.lineTo(x + 20, peak);
      ctx.lineTo(x + 40, y + hillH);
    }
    ctx.lineTo(w + 50, h);
    ctx.lineTo(-50, h);
    ctx.closePath();
    ctx.fill();
  }
}

export type Camera = { x: number; y: number; zoom: number };

export function updateCamera(cam: Camera, target: { x: number; y: number } | null, w: number, h: number) {
  if (!("zoom" in cam) || cam.zoom == null) cam.zoom = 1;
  cam.zoom += ((cam.zoom < 0.85 ? 0.85 : cam.zoom > 1.65 ? 1.65 : cam.zoom) - cam.zoom) * 0.2;
  if (!target) {
    cam.x += (0 - cam.x) * 0.05;
    cam.y += (0 - cam.y) * 0.05;
    return;
  }
  const maxX = (w * 0.22) / cam.zoom;
  const maxY = (h * 0.18) / cam.zoom;
  const tx = Math.max(-maxX, Math.min(maxX, (target.x - w * 0.5) * 0.35));
  const ty = Math.max(-maxY, Math.min(maxY, (target.y - h * 0.42) * 0.3));
  cam.x += (tx - cam.x) * 0.06;
  cam.y += (ty - cam.y) * 0.06;
}

export function nudgeZoom(cam: Camera, delta: number) {
  if (!cam.zoom) cam.zoom = 1;
  cam.zoom = Math.max(0.85, Math.min(1.65, cam.zoom + delta));
}

export function spawnRipple(ripples: Ripple[], x: number, y: number) {
  ripples.push({ x, y, r: 2, life: 24 });
}

export function tickRipples(ripples: Ripple[]) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].r += 1.2;
    ripples[i].life--;
    if (ripples[i].life <= 0) ripples.splice(i, 1);
  }
}

export function drawRipples(ctx: CanvasRenderingContext2D, ripples: Ripple[]) {
  for (const r of ripples) {
    ctx.strokeStyle = `rgba(255,213,79,${r.life / 24})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x - r.r, r.y - r.r, r.r * 2, r.r * 2);
  }
}

export function drawTree(ctx: CanvasRenderingContext2D, gx: number, gy: number, tick: number) {
  const sway = Math.sin(tick * 0.03 + gx) > 0.5 ? 0 : 1;
  const x = gx * TILE + sway;
  const y = gy * TILE;
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(x + 6, y + 10, 4, 6);
  ctx.fillStyle = PAL.tree;
  ctx.fillRect(x + 1, y + 1, 14, 11);
  ctx.fillStyle = PAL.treeHi;
  ctx.fillRect(x + 3, y + 3, 5, 5);
  ctx.fillRect(x + 9, y + 2, 4, 4);
}

export function drawFlower(ctx: CanvasRenderingContext2D, gx: number, gy: number, tick: number) {
  const x = gx * TILE + 6;
  const y = gy * TILE + 10;
  ctx.fillStyle = PAL.grass2;
  ctx.fillRect(x, y, 2, 4);
  const colors = ["#FF6B9D", "#FFD54F", "#81C784"];
  ctx.fillStyle = colors[(gx + gy) % 3];
  ctx.fillRect(x - 1, y - 2, 4, 4);
  if ((tick + gx) % 40 < 5) {
    ctx.fillStyle = PAL.star;
    ctx.fillRect(x + 5, y - 6, 2, 2);
  }
}

export function drawClouds(ctx: CanvasRenderingContext2D, tick: number, night: number) {
  const col = night > 0.4 ? PAL.cloudNight : PAL.cloud;
  ctx.fillStyle = col;
  const clouds = [
    { x: (tick * 0.12) % (COLS * TILE + 100), y: 14, w: 36 },
    { x: (120 + tick * 0.08) % (COLS * TILE + 140), y: 28, w: 28 },
    { x: (280 + tick * 0.06) % (COLS * TILE + 120), y: 8, w: 42 },
  ];
  for (const c of clouds) {
    ctx.globalAlpha = 1 - night * 0.5;
    ctx.fillRect(c.x, c.y, c.w, 8);
    ctx.fillRect(c.x + 10, c.y - 6, c.w * 0.65, 12);
    ctx.fillRect(c.x + 22, c.y - 2, c.w * 0.4, 8);
    ctx.globalAlpha = 1;
  }
}

export function drawStars(ctx: CanvasRenderingContext2D, tick: number, night: number) {
  if (night < 0.35) return;
  ctx.fillStyle = "#FFF";
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 97) % (COLS * TILE));
    const sy = (i * 43) % (ROWS * TILE * 0.35);
    const tw = Math.sin(tick * 0.05 + i) > 0.6 ? 1 : 0;
    if (tw) ctx.fillRect(sx, sy, 1, 1);
  }
}

export function spawnParticles(
  particles: Particle[],
  d: SampleDistrict,
  kind: Particle["kind"],
) {
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: d.gx * TILE + 20 + Math.random() * 20,
      y: d.gy * TILE + Math.random() * 10,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.5,
      life: 40 + Math.random() * 30,
      kind,
      color: kind === "heart" ? PAL.heart : kind === "anger" ? "#FF5722" : PAL.gold,
    });
  }
}

export function tickParticles(particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.life / 30);
    if (p.kind === "heart") {
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.fillRect(p.x + 3, p.y, 3, 3);
      ctx.fillRect(p.x + 1, p.y + 3, 4, 3);
    } else {
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}

export type Ambient = {
  kind: "butterfly" | "bird" | "chicken";
  x: number;
  y: number;
  vx: number;
  vy: number;
  frame: number;
  color: string;
};

export function initAmbients(): Ambient[] {
  return [
    { kind: "butterfly", x: 80, y: 120, vx: 0.4, vy: 0.15, frame: 0, color: "#FF6B9D" },
    { kind: "butterfly", x: 200, y: 90, vx: -0.35, vy: 0.2, frame: 2, color: "#FFD54F" },
    { kind: "bird", x: 300, y: 40, vx: 0.8, vy: 0.05, frame: 0, color: "#37474F" },
    { kind: "chicken", x: 11 * TILE, y: 15 * TILE, vx: 0.08, vy: 0, frame: 0, color: "#FFF" },
  ];
}

export function tickAmbients(list: Ambient[], w: number, h: number) {
  for (const a of list) {
    a.x += a.vx;
    a.y += a.vy;
    a.frame++;
    if (a.kind === "butterfly") {
      a.vy = Math.sin(a.frame * 0.08) * 0.25;
      if (a.x < 0 || a.x > w) a.vx *= -1;
      if (a.y < 40 || a.y > h * 0.6) a.vy *= -1;
    }
    if (a.kind === "bird") {
      if (a.x > w + 20) {
        a.x = -20;
        a.y = 20 + Math.random() * 40;
      }
    }
    if (a.kind === "chicken") {
      if (a.x > 13 * TILE || a.x < 9 * TILE) a.vx *= -1;
    }
  }
}

export function drawAmbients(ctx: CanvasRenderingContext2D, list: Ambient[], tick: number) {
  for (const a of list) {
    if (a.kind === "butterfly") {
      const flap = Math.sin(tick * 0.3 + a.frame) > 0;
      ctx.fillStyle = a.color;
      ctx.fillRect(a.x, a.y, 3, 2);
      if (flap) {
        ctx.fillRect(a.x - 3, a.y - 1, 3, 2);
        ctx.fillRect(a.x + 3, a.y - 1, 3, 2);
      }
    } else if (a.kind === "bird") {
      ctx.fillStyle = a.color;
      ctx.fillRect(a.x, a.y, 5, 3);
      ctx.fillRect(a.x + 2, a.y - 2, 3, 2);
    } else {
      const step = Math.floor(tick / 10) % 2;
      ctx.fillStyle = a.color;
      ctx.fillRect(a.x, a.y, 6, 5);
      ctx.fillStyle = "#FF9800";
      ctx.fillRect(a.x + 5, a.y + 1, 3, 3);
      ctx.fillStyle = "#FF5722";
      ctx.fillRect(a.x + 1, a.y + 5 + step, 2, 2);
      ctx.fillRect(a.x + 4, a.y + 5 - step, 2, 2);
    }
  }
}

export function drawDistrictRoutes(
  ctx: CanvasRenderingContext2D,
  districts: SampleDistrict[],
  tick: number,
  selectedId: string | null,
) {
  const links: [string, string][] = [
    ["d0", "d6"],
    ["d1", "d0"],
    ["d4", "d5"],
    ["d2", "d3"],
    ["d6", "d9"],
    ["d8", "d0"],
  ];
  ctx.setLineDash([3, 5]);
  ctx.lineDashOffset = -tick * 0.3;
  for (const [a, b] of links) {
    const da = districts.find((d) => d.id === a);
    const db = districts.find((d) => d.id === b);
    if (!da || !db) continue;
    const ax = da.gx * TILE + 32;
    const ay = da.gy * TILE + 8;
    const bx = db.gx * TILE + 32;
    const by = db.gy * TILE + 8;
    const hot = selectedId === a || selectedId === b;
    ctx.strokeStyle = hot ? PAL.gold : "rgba(93,64,55,0.5)";
    ctx.lineWidth = hot ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function drawDecor(ctx: CanvasRenderingContext2D, tick: number) {
  const cx = 10 * TILE;
  const cy = 15 * TILE;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? "#689F38" : "#558B2F";
    ctx.fillRect(cx + i * 14, cy, 10, 8);
    ctx.fillStyle = "#33691E";
    ctx.fillRect(cx + i * 14 + 3, cy - 4, 4, 4);
  }

  const fx = 15 * TILE + 8;
  const fy = 9 * TILE;
  ctx.fillStyle = "#795548";
  ctx.fillRect(fx, fy + 4, 10, 6);
  const flicker = (tick >> 2) % 3;
  ctx.fillStyle = flicker ? "#FF9800" : "#FF5722";
  ctx.fillRect(fx + 2, fy - flicker, 6, 6);
  ctx.fillStyle = "#FFD54F";
  ctx.fillRect(fx + 3, fy + 1 - flicker, 4, 3);

  ctx.fillStyle = "#8D6E63";
  ctx.fillRect(3 * TILE, 9 * TILE + 6, 4, 8);
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(3 * TILE - 2, 9 * TILE, 8, 8);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "4px monospace";
  ctx.fillText("INVOICE", 3 * TILE - 1, 9 * TILE + 6);
}

export function shakeOffset(power: number, tick: number) {
  if (power <= 0) return { x: 0, y: 0 };
  return {
    x: Math.sin(tick * 1.7) * power * 2,
    y: Math.cos(tick * 2.1) * power * 1.5,
  };
}

export function drawRehearseFlash(ctx: CanvasRenderingContext2D, w: number, h: number, power: number) {
  if (power <= 0) return;
  ctx.fillStyle = `rgba(255,213,79,${power * 0.08})`;
  ctx.fillRect(0, 0, w, h);
}

/** Move Forge agent toward a district when inspecting */
export function steerAgentToDistrict(states: NpcState[], district: SampleDistrict | null, speed = 0.035) {
  const forge = states.find((n) => n.id === "n0");
  if (!forge || !district) return;
  const tx = district.gx + 1.5;
  const ty = district.gy + 1.5;
  const dx = tx - forge.wx;
  const dy = ty - forge.wy;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.15) {
    forge.wx += (dx / dist) * speed;
    forge.wy += (dy / dist) * speed;
    if (Math.abs(dx) > Math.abs(dy)) forge.dir = dx > 0 ? 3 : 1;
    else forge.dir = dy > 0 ? 2 : 0;
  }
}

export function drawForgeAura(ctx: CanvasRenderingContext2D, n: NpcState, tick: number) {
  if (n.role !== "Agent") return;
  const x = n.wx * TILE + 9;
  const y = n.wy * TILE + 8;
  const r = 8 + ((tick >> 2) % 4);
  ctx.strokeStyle = `rgba(41,182,246,${0.3 + Math.sin(tick * 0.1) * 0.2})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - r, y - r, r * 2, r * 2);
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  districts: SampleDistrict[],
  selectedId: string | null,
  npcs: NpcState[],
) {
  const mw = 80;
  const mh = 55;
  const mx = COLS * TILE - mw - 6;
  const my = 6;
  ctx.fillStyle = "rgba(26,18,12,0.75)";
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, mh);

  const sx = mw / COLS;
  const sy = mh / ROWS;

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = TERRAIN[y][x];
      if (t === "water" || t === "bridge") {
        ctx.fillStyle = PAL.water2;
        ctx.fillRect(mx + x * sx, my + y * sy, sx + 0.5, sy + 0.5);
      } else if (t === "path") {
        ctx.fillStyle = PAL.pathEdge;
        ctx.fillRect(mx + x * sx, my + y * sy, sx + 0.5, sy + 0.5);
      }
    }
  }

  for (const d of districts) {
    ctx.fillStyle = d.id === selectedId ? PAL.gold : KIND_ROOF[d.kind];
    ctx.fillRect(mx + d.gx * sx, my + d.gy * sy, sx * 3, sy * 2);
  }
  for (const n of npcs) {
    ctx.fillStyle = n.color;
    ctx.fillRect(mx + n.wx * sx, my + n.wy * sy, 2, 2);
  }

  ctx.fillStyle = PAL.gold;
  ctx.font = "4px monospace";
  ctx.textAlign = "left";
  ctx.fillText("MAP", mx + 3, my + mh - 3);
}


export type Footprint = { x: number; y: number; life: number; dir: number };

export function spawnFootprint(list: Footprint[], x: number, y: number, dir: number) {
  list.push({ x, y, life: 28, dir });
  if (list.length > 48) list.splice(0, list.length - 48);
}

export function tickFootprints(list: Footprint[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].life--;
    if (list[i].life <= 0) list.splice(i, 1);
  }
}

export function drawFootprints(ctx: CanvasRenderingContext2D, list: Footprint[]) {
  for (const f of list) {
    ctx.globalAlpha = Math.min(0.45, f.life / 28);
    ctx.fillStyle = "#5D4037";
    const ox = f.dir === 1 || f.dir === 3 ? 2 : 0;
    ctx.fillRect(f.x - 1 - ox, f.y, 2, 2);
    ctx.fillRect(f.x + 2 + ox, f.y + 1, 2, 2);
    ctx.globalAlpha = 1;
  }
}

export function drawSelectionRing(ctx: CanvasRenderingContext2D, d: SampleDistrict, tick: number) {
  const bx = d.gx * TILE + TILE * 2;
  const by = d.gy * TILE + 8;
  const pulse = 2 + Math.sin(tick * 0.12) * 2;
  ctx.strokeStyle = `rgba(255, 213, 79, ${0.55 + Math.sin(tick * 0.15) * 0.25})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx - 18 - pulse, by - 36 - pulse, 36 + pulse * 2, 40 + pulse * 2);
  ctx.fillStyle = "rgba(255, 213, 79, 0.12)";
  ctx.fillRect(bx - 18 - pulse, by - 36 - pulse, 36 + pulse * 2, 40 + pulse * 2);
}


export type Emote = {
  x: number;
  y: number;
  kind: "heart" | "anger" | "think" | "spark";
  life: number;
};

export function spawnEmote(list: Emote[], n: { wx: number; wy: number }, kind: Emote["kind"]) {
  list.push({
    x: n.wx * TILE + 8,
    y: n.wy * TILE - 6,
    kind,
    life: 40 + Math.floor(Math.random() * 20),
  });
  if (list.length > 24) list.splice(0, list.length - 24);
}

export function tickEmotes(list: Emote[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].y -= 0.25;
    list[i].life--;
    if (list[i].life <= 0) list.splice(i, 1);
  }
}

export function drawEmotes(ctx: CanvasRenderingContext2D, list: Emote[]) {
  for (const e of list) {
    ctx.globalAlpha = Math.min(1, e.life / 15);
    if (e.kind === "heart") {
      ctx.fillStyle = PAL.heart;
      ctx.fillRect(e.x, e.y, 3, 3);
      ctx.fillRect(e.x + 4, e.y, 3, 3);
      ctx.fillRect(e.x + 1, e.y + 3, 5, 3);
      ctx.fillRect(e.x + 2, e.y + 6, 3, 2);
    } else if (e.kind === "anger") {
      ctx.fillStyle = "#FF5722";
      ctx.fillRect(e.x, e.y, 2, 2);
      ctx.fillRect(e.x + 4, e.y - 2, 2, 2);
      ctx.fillRect(e.x + 7, e.y, 2, 2);
    } else if (e.kind === "think") {
      ctx.fillStyle = "#FFF8E7";
      ctx.fillRect(e.x, e.y, 8, 6);
      ctx.fillStyle = "#3E2723";
      ctx.fillRect(e.x + 2, e.y + 2, 2, 2);
      ctx.fillRect(e.x + 5, e.y + 2, 2, 2);
    } else {
      ctx.fillStyle = PAL.gold;
      ctx.fillRect(e.x + 2, e.y, 2, 6);
      ctx.fillRect(e.x, e.y + 2, 6, 2);
    }
    ctx.globalAlpha = 1;
  }
}

export function drawFog(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number, day: number) {
  // Dawn/dusk fog band near horizon
  const fogAmt = Math.max(0, 1 - Math.abs(day - 0.35) * 4);
  if (fogAmt < 0.05) return;
  const y0 = h * 0.32;
  for (let i = 0; i < 5; i++) {
    const drift = ((tick * 0.15) + i * 40) % (w + 60) - 30;
    ctx.fillStyle = `rgba(245, 245, 255, ${0.06 * fogAmt})`;
    ctx.fillRect(drift, y0 + i * 6, 90 + i * 20, 10);
  }
}

export function drawLightning(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tick: number,
  rainOn: boolean,
): number {
  if (!rainOn) return 0;
  // Occasional flash
  const bolt = tick % 180;
  if (bolt > 6 && bolt < 12) {
    ctx.fillStyle = `rgba(255, 255, 240, ${0.35 - (bolt - 6) * 0.05})`;
    ctx.fillRect(0, 0, w, h);
    return 1;
  }
  if (bolt === 0 || bolt === 3) {
    const x = 40 + ((tick * 17) % (w - 80));
    ctx.strokeStyle = "#FFFDE7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 8, 30);
    ctx.lineTo(x - 4, 50);
    ctx.lineTo(x + 10, 80);
    ctx.stroke();
    return 1;
  }
  return 0;
}

export function dayPhaseLabel(day: number): "NIGHT" | "DAWN" | "DAY" | "DUSK" {
  if (day < 0.2) return "NIGHT";
  if (day < 0.4) return "DAWN";
  if (day < 0.75) return "DAY";
  if (day < 0.9) return "DUSK";
  return "NIGHT";
}


export type Petal = { x: number; y: number; vx: number; vy: number; rot: number; color: string };

export function initPetals(count = 18): Petal[] {
  const colors = ["#F8BBD0", "#FFCCBC", "#FFF59D", "#C8E6C9"];
  return Array.from({ length: count }, () => ({
    x: Math.random() * COLS * TILE,
    y: Math.random() * ROWS * TILE * 0.6,
    vx: 0.15 + Math.random() * 0.25,
    vy: 0.2 + Math.random() * 0.35,
    rot: Math.random() * Math.PI,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function tickPetals(list: Petal[], w: number, h: number, tick: number) {
  for (const p of list) {
    p.x += p.vx + Math.sin(tick * 0.02 + p.y) * 0.15;
    p.y += p.vy;
    p.rot += 0.04;
    if (p.y > h * 0.85) {
      p.y = -4;
      p.x = Math.random() * w;
    }
    if (p.x > w) p.x = 0;
  }
}

export function drawPetals(ctx: CanvasRenderingContext2D, list: Petal[]) {
  for (const p of list) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(p.x, p.y, 3, 2);
    ctx.fillRect(p.x + 1, p.y + 1, 2, 2);
    ctx.globalAlpha = 1;
  }
}

export function drawWaterSparkles(ctx: CanvasRenderingContext2D, tick: number) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (TERRAIN[y][x] !== "water" && TERRAIN[y][x] !== "bridge") continue;
      if (((x * 13 + y * 7 + (tick >> 3)) % 17) !== 0) continue;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(x * TILE + ((tick + x) % 12), y * TILE + 4 + ((tick >> 2) % 6), 2, 1);
    }
  }
}

export function drawNightLanterns(
  ctx: CanvasRenderingContext2D,
  districts: SampleDistrict[],
  night: number,
  tick: number,
) {
  if (night < 0.35) return;
  const a = (night - 0.35) * 1.2;
  for (const d of districts) {
    const bx = d.gx * TILE + 20;
    const by = d.gy * TILE - 4;
    const pulse = 0.5 + Math.sin(tick * 0.08 + d.gx) * 0.2;
    ctx.fillStyle = `rgba(255, 193, 7, ${a * pulse * 0.35})`;
    ctx.beginPath();
    ctx.arc(bx, by + 10, 14 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 236, 179, ${a * pulse})`;
    ctx.fillRect(bx - 2, by + 4, 4, 4);
  }
}

export function drawComboBanner(
  ctx: CanvasRenderingContext2D,
  w: number,
  combo: number,
  tick: number,
) {
  if (combo < 2) return;
  ctx.fillStyle = "rgba(26,18,12,0.7)";
  ctx.fillRect(w / 2 - 40, 8, 80, 14);
  ctx.strokeStyle = PAL.gold;
  ctx.strokeRect(w / 2 - 40, 8, 80, 14);
  ctx.fillStyle = PAL.gold;
  ctx.font = "bold 6px monospace";
  ctx.textAlign = "center";
  const bounce = Math.sin(tick * 0.3) * 1;
  ctx.fillText(`COMBO ×${combo}`, w / 2, 18 + bounce);
}


/** Slow NPCs at night; non-agents drift toward nearest district doorway */
export function tickNpcSchedule(
  states: NpcState[],
  districts: SampleDistrict[],
  night: number,
  speed = 0.018,
) {
  const nightSlow = night > 0.55 ? 0.45 : 1;
  tickNpcs(states, speed * nightSlow);
  if (night < 0.6) return;
  for (const n of states) {
    if (n.role === "Agent") continue;
    // Prefer a home district by kind affinity
    const home =
      n.mood === "angry"
        ? districts.find((d) => d.kind === "billing")
        : n.mood === "anxious"
          ? districts.find((d) => d.kind === "api")
          : districts.find((d) => d.kind === "auth") ?? districts[0];
    if (!home) continue;
    const tx = home.gx + 1.2;
    const ty = home.gy + 1.2;
    const dx = tx - n.wx;
    const dy = ty - n.wy;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.4) {
      n.wx += (dx / dist) * speed * 0.7;
      n.wy += (dy / dist) * speed * 0.7;
      if (Math.abs(dx) > Math.abs(dy)) n.dir = dx > 0 ? 3 : 1;
      else n.dir = dy > 0 ? 2 : 0;
    }
  }
}

export function drawFloatingBars(
  ctx: CanvasRenderingContext2D,
  districts: SampleDistrict[],
  tick: number,
) {
  for (const d of districts) {
    if (d.health >= 0.8 && d.load <= 0.55) continue;
    const x = d.gx * TILE + 4;
    const y = d.gy * TILE - 22 + Math.sin(tick * 0.05 + d.gx) * 1;
    // HP
    ctx.fillStyle = "rgba(26,18,12,0.75)";
    ctx.fillRect(x, y, 28, 5);
    ctx.fillStyle = "#42A5F5";
    ctx.fillRect(x + 1, y + 1, Math.max(1, 26 * d.health), 1);
    ctx.fillStyle = "#FFA726";
    ctx.fillRect(x + 1, y + 3, Math.max(1, 26 * d.load), 1);
  }
}

export function drawSeasonTint(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  // Slow season cycle: spring pink → summer green → autumn amber → winter blue
  const season = (Math.sin(tick * 0.0015) + 1) / 2;
  let tint: string;
  if (season < 0.25) tint = "rgba(248,187,208,0.06)";
  else if (season < 0.5) tint = "rgba(165,214,167,0.05)";
  else if (season < 0.75) tint = "rgba(255,183,77,0.06)";
  else tint = "rgba(144,202,249,0.07)";
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
}

export function drawAgentTrail(
  ctx: CanvasRenderingContext2D,
  from: { wx: number; wy: number } | null,
  to: SampleDistrict | null,
  tick: number,
) {
  if (!from || !to) return;
  const ax = from.wx * TILE + 8;
  const ay = from.wy * TILE + 8;
  const bx = to.gx * TILE + 24;
  const by = to.gy * TILE + 8;
  ctx.strokeStyle = `rgba(41,182,246,${0.35 + Math.sin(tick * 0.2) * 0.15})`;
  ctx.setLineDash([3, 3]);
  ctx.lineDashOffset = -tick * 0.3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 20, bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function seasonName(tick: number): string {
  const season = (Math.sin(tick * 0.0015) + 1) / 2;
  if (season < 0.25) return "SPRING";
  if (season < 0.5) return "SUMMER";
  if (season < 0.75) return "AUTUMN";
  return "WINTER";
}


export function minimapBounds() {
  const mw = 80;
  const mh = 55;
  return {
    x: COLS * TILE - mw - 6,
    y: 6,
    w: mw,
    h: mh,
  };
}

export function hitMinimapDistrict(
  districts: SampleDistrict[],
  cx: number,
  cy: number,
): SampleDistrict | null {
  const b = minimapBounds();
  if (cx < b.x || cy < b.y || cx > b.x + b.w || cy > b.y + b.h) return null;
  const sx = b.w / COLS;
  const sy = b.h / ROWS;
  let best: SampleDistrict | null = null;
  let bestDist = Infinity;
  for (const d of districts) {
    const dx = b.x + d.gx * sx + sx;
    const dy = b.y + d.gy * sy + sy;
    const dist = Math.hypot(cx - dx, cy - dy);
    if (dist < bestDist && dist < 14) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

export type Firework = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export function spawnFireworkBurst(list: Firework[], x: number, y: number) {
  const colors = ["#FFD54F", "#EF5350", "#66BB6A", "#42A5F5", "#AB47BC", "#FFF8E7"];
  for (let i = 0; i < 18; i++) {
    const a = (Math.PI * 2 * i) / 18;
    list.push({
      x,
      y,
      vx: Math.cos(a) * (1 + Math.random()),
      vy: Math.sin(a) * (1 + Math.random()),
      life: 30 + Math.random() * 20,
      color: colors[i % colors.length],
    });
  }
}

export function tickFireworks(list: Firework[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].x += list[i].vx;
    list[i].y += list[i].vy;
    list[i].vy += 0.04;
    list[i].life--;
    if (list[i].life <= 0) list.splice(i, 1);
  }
}

export function drawFireworks(ctx: CanvasRenderingContext2D, list: Firework[]) {
  for (const f of list) {
    ctx.globalAlpha = Math.min(1, f.life / 15);
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y, 2, 2);
    ctx.globalAlpha = 1;
  }
}
