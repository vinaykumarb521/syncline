import { skinById } from "./skins";

const KEY = "syncline";

export type RunMode = "endless" | "today";

export interface Save {
  best: number;
  todaySeed: number;
  todayBest: number;
  skin: string;
  muted: boolean;
  mode: RunMode;
}

const BLANK: Save = {
  best: 0,
  todaySeed: 0,
  todayBest: 0,
  skin: "ion",
  muted: false,
  mode: "endless",
};

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...BLANK };
    const parsed = JSON.parse(raw) as Partial<Save>;
    const mode = parsed.mode === "today" ? "today" : "endless";
    const skin = skinById(typeof parsed.skin === "string" ? parsed.skin : "ion").id;
    return {
      best: numberOr(parsed.best, 0),
      todaySeed: numberOr(parsed.todaySeed, 0),
      todayBest: numberOr(parsed.todayBest, 0),
      skin,
      muted: Boolean(parsed.muted),
      mode,
    };
  } catch {
    return { ...BLANK };
  }
}

export function writeSave(save: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode and full storage still leave the session playable */
  }
}
