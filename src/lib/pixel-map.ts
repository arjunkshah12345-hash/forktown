import type { District, Actor, SyntheticUser } from "@/lib/sim/types";
import type { SampleDistrict, SampleNpc } from "@/components/retro/sample-data";
import { COLS, ROWS } from "@/components/retro/pixel-engine";

const ROLE_COLORS = ["#5DADE2", "#E74C3C", "#F5B041", "#58D68D", "#AF7AC5", "#F1948A", "#76D7C4", "#F7DC6F"];

export function districtsToPixel(districts: District[]): SampleDistrict[] {
  // Spread buildings across the farm grid; nudge collisions.
  const used = new Set<string>();
  return districts.map((d) => {
    let gx = Math.max(2, Math.min(COLS - 4, Math.round((d.x / 100) * (COLS - 4)) + 1));
    let gy = Math.max(3, Math.min(ROWS - 4, Math.round((d.y / 100) * (ROWS - 4)) + 2));
    let guard = 0;
    while (used.has(`${gx},${gy}`) && guard++ < 40) {
      gx = ((gx + 2) % (COLS - 5)) + 2;
      if (guard % 3 === 0) gy = ((gy + 1) % (ROWS - 6)) + 3;
    }
    used.add(`${gx},${gy}`);
    return {
      id: d.id,
      name: d.name,
      kind: d.kind,
      gx,
      gy,
      health: d.health,
      load: d.load,
    };
  });
}

export function townspeopleToNpcs(
  actors: Actor[],
  users: SyntheticUser[],
  districts: SampleDistrict[],
): SampleNpc[] {
  const homes = districts.length
    ? districts
    : [{ gx: 10, gy: 10 } as SampleDistrict];

  const fromActors: SampleNpc[] = actors.slice(0, 6).map((a, i) => {
    const home = homes[i % homes.length];
    return {
      id: a.id,
      name: a.name,
      role: a.kind,
      gx: Math.min(COLS - 2, home.gx + (i % 3)),
      gy: Math.min(ROWS - 2, home.gy + ((i * 2) % 3)),
      color: ROLE_COLORS[i % ROLE_COLORS.length],
      mood: a.kind === "attacker" || a.kind === "sre" ? "anxious" : "calm",
    };
  });

  const angryBuyers = users
    .filter((u) => u.anger > 0.4 || u.segment === "legacy")
    .slice(0, 6)
    .map((u, i) => {
      const home = homes[(i + 2) % homes.length];
      return {
        id: u.id,
        name: u.name,
        role: `${u.segment} buyer`,
        gx: Math.min(COLS - 2, home.gx + 1 + (i % 2)),
        gy: Math.min(ROWS - 2, home.gy + 1),
        color: ROLE_COLORS[(i + 3) % ROLE_COLORS.length],
        mood: (u.anger > 0.55 ? "angry" : u.anger > 0.35 ? "anxious" : "calm") as SampleNpc["mood"],
      };
    });

  const agent: SampleNpc = {
    id: "agent-forge",
    name: "Forge",
    role: "Agent",
    gx: Math.floor(COLS / 2),
    gy: Math.floor(ROWS / 2),
    color: "#5DADE2",
    mood: "calm",
  };

  return [agent, ...fromActors, ...angryBuyers].slice(0, 12);
}

export function mindLines(
  minds: { name: string; role: string; memories: { summary: string; salience: number }[] }[],
): { speaker: string; portrait: string; text: string }[] {
  return minds.slice(0, 8).map((m) => {
    const mem = m.memories.slice().sort((a, b) => b.salience - a.salience)[0];
    const portrait =
      m.role.includes("agent") || m.name === "Forge"
        ? "agent"
        : m.role.includes("sre") || m.role.includes("attacker")
          ? "sre"
          : "buyer";
    return {
      speaker: m.name,
      portrait,
      text: mem?.summary ?? `${m.name} is watching the cutover with a fixed reference point.`,
    };
  });
}
