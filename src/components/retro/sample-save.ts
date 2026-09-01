export type SampleSave = {
  xp: number;
  level: number;
  questSurvive: boolean;
  questMara: boolean;
  music: boolean;
  visited: boolean;
  maraTrust: number;
  energy: number;
  achievements: string[];
};

const KEY = "forktown-sample-v2";

export function loadSampleSave(): SampleSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem("forktown-sample-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SampleSave>;
    return {
      xp: parsed.xp ?? 40,
      level: parsed.level ?? 1,
      questSurvive: !!parsed.questSurvive,
      questMara: !!parsed.questMara,
      music: !!parsed.music,
      visited: true,
      maraTrust: parsed.maraTrust ?? 42,
      energy: parsed.energy ?? 100,
      achievements: parsed.achievements ?? [],
    };
  } catch {
    return null;
  }
}

export function writeSampleSave(save: SampleSave) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}
