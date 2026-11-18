import { describe, expect, it } from "vitest";
import { createSim, move, tick } from "./sim";

describe("sim", () => {
  it("awards a sync when a lane change lands on the beat", () => {
    const sim = createSim(3);
    const events = move(sim, -1);
    expect(events[0]?.type).toBe("sync");
    expect(sim.targetLane).toBe(0);
    expect(sim.syncs).toBe(1);
    expect(sim.score).toBeGreaterThan(0);
  });

  it("still switches off the beat without a sync", () => {
    const sim = createSim(3);
    sim.beat = 0.5;
    const events = move(sim, 1);
    expect(events.map((event) => event.type)).toEqual(["shift"]);
    expect(sim.syncs).toBe(0);
    expect(sim.targetLane).toBe(2);
  });

  it("refuses to leave the road", () => {
    const sim = createSim(3);
    move(sim, 1);
    expect(move(sim, 1)).toEqual([]);
    expect(sim.targetLane).toBe(2);
  });

  it("crashes a player who stays in a blocked lane", () => {
    const sim = createSim(9);
    sim.chart.halt();
    sim.chart.rows.splice(0, sim.chart.rows.length, {
      beat: 4,
      blocks: [false, true, false],
      gemLane: null,
    });
    let guard = 0;
    while (sim.status === "playing" && sim.beat < 5 && guard < 2000) {
      tick(sim, 1 / 60);
      guard += 1;
    }
    expect(sim.status).toBe("crashed");
  });

  it("lets a committed lane change collect the gem and survive", () => {
    const sim = createSim(9);
    sim.chart.halt();
    sim.chart.rows.splice(0, sim.chart.rows.length, {
      beat: 4,
      blocks: [false, true, false],
      gemLane: 0,
    });
    sim.targetLane = 0;
    sim.lanePos = 0;
    let guard = 0;
    while (sim.beat < 4.4 && sim.status === "playing" && guard < 2000) {
      tick(sim, 1 / 60);
      guard += 1;
    }
    expect(sim.status).toBe("playing");
    expect(sim.gems).toBe(1);
  });

  it("adds distance score while the run is alive", () => {
    const sim = createSim(2);
    const start = sim.score;
    for (let i = 0; i < 30; i += 1) tick(sim, 1 / 60);
    expect(sim.score).toBeGreaterThan(start);
    expect(sim.bpm).toBeGreaterThan(90);
  });
});
