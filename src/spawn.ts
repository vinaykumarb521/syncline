import { TUNE } from "./tune";

export type Blocks = [boolean, boolean, boolean];

export interface Row {
  beat: number;
  blocks: Blocks;
  gemLane: 0 | 1 | 2 | null;
  gemTaken?: boolean;
  passed?: boolean;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function difficultyForBeat(beat: number): number {
  return Math.max(0, Math.min(1, (beat - TUNE.firstBeat) / 96));
}

export function bpmForBeat(beat: number): number {
  return 96 + difficultyForBeat(beat) * 72;
}

export function openLanes(blocks: Blocks): number[] {
  return [0, 1, 2].filter((lane) => !blocks[lane]);
}

/** Lanes a player can reach before this row, moving at most one lane per beat of gap. */
export function reachable(from: Set<number>, gapBeats: number, blocks: Blocks): Set<number> {
  const steps = gapBeats >= 2 ? 2 : gapBeats >= 1 ? 1 : 0;
  const next = new Set<number>();
  for (const lane of from) {
    for (let delta = -steps; delta <= steps; delta += 1) {
      const laneNext = lane + delta;
      if (laneNext >= 0 && laneNext <= 2 && !blocks[laneNext]) next.add(laneNext);
    }
  }
  return next;
}

export function isSurvivable(rows: Row[], startLane = 1): boolean {
  let possible = new Set<number>([startLane]);
  let prev = 0;
  for (const row of rows) {
    if (openLanes(row.blocks).length === 0) return false;
    if (row.gemLane != null && row.blocks[row.gemLane]) return false;
    possible = reachable(possible, row.beat - prev, row.blocks);
    if (possible.size === 0) return false;
    prev = row.beat;
  }
  return true;
}

const SINGLE: Blocks[] = [
  [true, false, false],
  [false, true, false],
  [false, false, true],
];

const DOUBLE: Blocks[] = [
  [true, true, false],
  [true, false, true],
  [false, true, true],
];

export function craftRow(
  beat: number,
  prevBeat: number,
  possible: Set<number>,
  rng: () => number,
): { row: Row; possible: Set<number> } {
  const from = possible.size > 0 ? possible : new Set<number>([1]);
  const gap = beat - prevBeat;
  const difficulty = difficultyForBeat(beat);
  const patterns = [...SINGLE];
  if (difficulty > 0.62 && gap >= 2) patterns.push(...DOUBLE);

  const candidates = patterns.filter((blocks) => reachable(from, gap, blocks).size > 0);
  let blocks: Blocks;
  if (candidates.length === 0) {
    blocks = [true, true, true];
    for (const lane of from) blocks[lane] = false;
    if (openLanes(blocks).length === 3) blocks = [true, false, false];
  } else {
    const challenging = candidates.filter((pattern) => {
      for (const lane of from) if (pattern[lane]) return true;
      return false;
    });
    const pool = challenging.length > 0 && rng() < 0.78 ? challenging : candidates;
    blocks = pool[Math.floor(rng() * pool.length)];
  }

  const next = reachable(from, gap, blocks);
  const open = openLanes(blocks).filter((lane): lane is 0 | 1 | 2 => next.has(lane));
  const gemPool = open.length > 0 ? open : (openLanes(blocks) as (0 | 1 | 2)[]);
  const gemLane = rng() < 0.36 + difficulty * 0.2 ? gemPool[Math.floor(rng() * gemPool.length)] : null;

  return {
    row: { beat, blocks, gemLane, gemTaken: false, passed: false },
    possible: next,
  };
}

export class Chart {
  readonly rows: Row[] = [];
  private possible = new Set<number>([1]);
  private prev = 0;
  private nextBeat = TUNE.firstBeat;
  private halted = false;
  private readonly rng: () => number;

  constructor(seed: number) {
    this.rng = mulberry32(seed);
  }

  /** Stops new rows. Tests use this to place a single scripted barrier. */
  halt(): void {
    this.halted = true;
  }

  /** Side barriers only, then one center block, so a first run can see the road before it has to move. */
  private seedTutorial(): void {
    const intro: Row[] = [
      { beat: 4, blocks: [true, false, false], gemLane: 1, gemTaken: false, passed: false },
      { beat: 7, blocks: [false, false, true], gemLane: null, gemTaken: false, passed: false },
      { beat: 10, blocks: [false, true, false], gemLane: 0, gemTaken: false, passed: false },
    ];
    let possible = new Set<number>([1]);
    let prev = 0;
    for (const row of intro) {
      possible = reachable(possible, row.beat - prev, row.blocks);
      prev = row.beat;
      this.rows.push(row);
    }
    this.possible = possible;
    this.prev = prev;
    this.nextBeat = prev + 2;
  }

  ensure(untilBeat: number): void {
    if (this.halted) return;
    if (this.rows.length === 0) this.seedTutorial();
    let guard = 0;
    while (this.nextBeat <= untilBeat && guard < 4000) {
      guard += 1;
      const crafted = craftRow(this.nextBeat, this.prev, this.possible, this.rng);
      this.rows.push(crafted.row);
      this.possible = crafted.possible;
      this.prev = this.nextBeat;
      const difficulty = difficultyForBeat(this.nextBeat);
      const gap = difficulty > 0.48 && this.rng() < 0.6 ? 1 : 2;
      const breath = this.rng() < 0.12 ? 2 : 0;
      this.nextBeat += gap + breath;
    }
  }
}

/** Same calendar day worldwide, so friends can compare a Today score. */
export function dailySeed(date = new Date()): number {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}
