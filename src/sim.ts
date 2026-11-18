import { bpmForBeat, Chart, type Row } from "./spawn";
import { TUNE } from "./tune";

export type SimEvent =
  | { type: "beat" }
  | { type: "shift" }
  | { type: "sync"; text: string }
  | { type: "gem"; text: string }
  | { type: "near"; text: string }
  | { type: "crash" };

export interface Sim {
  seed: number;
  chart: Chart;
  beat: number;
  bpm: number;
  lanePos: number;
  targetLane: number;
  score: number;
  combo: number;
  bestCombo: number;
  syncs: number;
  gems: number;
  nears: number;
  status: "playing" | "crashed";
  lastSyncBeat: number;
}

export function createSim(seed: number): Sim {
  const chart = new Chart(seed);
  chart.ensure(TUNE.firstBeat + TUNE.lookAheadBeats);
  return {
    seed,
    chart,
    beat: 0,
    bpm: bpmForBeat(0),
    lanePos: 1,
    targetLane: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    syncs: 0,
    gems: 0,
    nears: 0,
    status: "playing",
    lastSyncBeat: -999,
  };
}

function comboText(combo: number, fallback: string): string {
  if (combo === 5) return "WARM";
  if (combo === 8) return "LOCKED IN";
  if (combo === 12) return "BLAZING";
  return fallback;
}

function bumpCombo(sim: Sim): void {
  sim.combo += 1;
  if (sim.combo > sim.bestCombo) sim.bestCombo = sim.combo;
}

export function move(sim: Sim, dir: -1 | 1, awardSync = true): SimEvent[] {
  if (sim.status !== "playing") return [];
  const next = Math.max(0, Math.min(2, sim.targetLane + dir));
  if (next === sim.targetLane) return [];
  sim.targetLane = next;
  if (!awardSync) return [{ type: "shift" }];

  const nearest = Math.round(sim.beat);
  const off = Math.abs(sim.beat - nearest);
  if (off <= TUNE.syncWindow && nearest !== sim.lastSyncBeat) {
    sim.lastSyncBeat = nearest;
    sim.syncs += 1;
    bumpCombo(sim);
    sim.score += TUNE.syncScore + sim.combo * 8;
    return [{ type: "sync", text: comboText(sim.combo, "SYNC") }];
  }
  return [{ type: "shift" }];
}

function clipRow(sim: Sim, row: Row): SimEvent[] {
  const events: SimEvent[] = [];
  for (let lane = 0; lane < 3; lane += 1) {
    if (!row.blocks[lane]) continue;
    if (Math.abs(sim.lanePos - lane) < TUNE.collideRadius) {
      sim.status = "crashed";
      events.push({ type: "crash" });
      return events;
    }
  }
  if (row.gemLane != null && !row.gemTaken && Math.abs(sim.lanePos - row.gemLane) < TUNE.collideRadius + 0.06) {
    row.gemTaken = true;
    sim.gems += 1;
    bumpCombo(sim);
    const gained = TUNE.gemScore + sim.combo * 12;
    sim.score += gained;
    events.push({ type: "gem", text: comboText(sim.combo, `+${gained}`) });
  }
  return events;
}

export function tick(sim: Sim, dt: number): SimEvent[] {
  if (sim.status !== "playing") return [];
  const step = Math.min(Math.max(dt, 0), 0.05);
  const events: SimEvent[] = [];
  sim.bpm = bpmForBeat(sim.beat);
  const prevFloor = Math.floor(sim.beat);
  sim.beat += step * (sim.bpm / 60);
  sim.score += step * (TUNE.scorePerSecond + sim.bpm * 0.06);
  const floor = Math.floor(sim.beat);
  if (floor !== prevFloor && floor - prevFloor < 3) events.push({ type: "beat" });

  const blend = 1 - Math.exp(-TUNE.laneStiffness * step);
  sim.lanePos += (sim.targetLane - sim.lanePos) * blend;
  sim.chart.ensure(sim.beat + TUNE.lookAheadBeats);

  for (const row of sim.chart.rows) {
    if (row.passed) continue;
    const delta = row.beat - sim.beat;
    if (delta < -TUNE.hitWindow) {
      row.passed = true;
      let close = false;
      for (let lane = 0; lane < 3; lane += 1) {
        if (!row.blocks[lane]) continue;
        const dist = Math.abs(sim.lanePos - lane);
        if (dist < TUNE.nearRadius && dist >= TUNE.collideRadius) close = true;
      }
      if (close) {
        sim.nears += 1;
        sim.score += TUNE.nearScore;
        events.push({ type: "near", text: "CLOSE" });
      }
      continue;
    }
    if (Math.abs(delta) <= TUNE.hitWindow) {
      const hit = clipRow(sim, row);
      events.push(...hit);
      if (hit.some((event) => event.type === "crash")) return events;
    }
  }
  return events;
}
