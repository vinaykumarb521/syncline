export interface Skin {
  id: string;
  name: string;
  min: number;
  core: string;
  glow: string;
  accent: string;
  barrier: string;
  barrierHot: string;
}

export const SKINS: Skin[] = [
  {
    id: "ion",
    name: "Ion",
    min: 0,
    core: "#f3fffd",
    glow: "#3dfff2",
    accent: "#8dfff6",
    barrier: "#ff2bd6",
    barrierHot: "#ff8ae4",
  },
  {
    id: "flare",
    name: "Flare",
    min: 400,
    core: "#fff4fa",
    glow: "#ff2bd6",
    accent: "#ff8ad6",
    barrier: "#3dfff2",
    barrierHot: "#bffff6",
  },
  {
    id: "venom",
    name: "Venom",
    min: 900,
    core: "#f7ffe8",
    glow: "#c6ff3d",
    accent: "#e4ff8a",
    barrier: "#ff2b6a",
    barrierHot: "#ff9ab8",
  },
  {
    id: "solar",
    name: "Solar",
    min: 1600,
    core: "#fff8ea",
    glow: "#ffb703",
    accent: "#ffe08a",
    barrier: "#4d7cff",
    barrierHot: "#b7c8ff",
  },
  {
    id: "void",
    name: "Void",
    min: 2600,
    core: "#f6efff",
    glow: "#b07cff",
    accent: "#d7b8ff",
    barrier: "#d6ff3d",
    barrierHot: "#f2ffb0",
  },
  {
    id: "halo",
    name: "Halo",
    min: 4000,
    core: "#ffffff",
    glow: "#f4f7ff",
    accent: "#ffffff",
    barrier: "#ff3d8a",
    barrierHot: "#ffd0e2",
  },
];

export function skinById(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}

export function bestScore(endlessBest: number, todayBest: number): number {
  return Math.max(endlessBest, todayBest);
}
