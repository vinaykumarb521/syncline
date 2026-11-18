import { describe, expect, it } from "vitest";
import { Chart, bpmForBeat, dailySeed, isSurvivable, openLanes } from "./spawn";

describe("chart", () => {
  it("keeps every generated run survivable and gems on open lanes", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const chart = new Chart(seed);
      chart.ensure(240);
      expect(chart.rows.length).toBeGreaterThan(40);
      expect(chart.rows[0]?.beat).toBe(4);
      expect(chart.rows[0]?.blocks).toEqual([true, false, false]);
      expect(chart.rows.find((row) => row.blocks[1])?.beat).toBe(10);
      expect(isSurvivable(chart.rows)).toBe(true);
      for (const row of chart.rows) {
        expect(openLanes(row.blocks).length).toBeGreaterThan(0);
        if (row.gemLane != null) expect(row.blocks[row.gemLane]).toBe(false);
      }
    }
  });

  it("rejects a one-beat jump across the whole road", () => {
    expect(
      isSurvivable([{ beat: 1, blocks: [true, true, false], gemLane: null }], 0),
    ).toBe(false);
  });

  it("ramps tempo inside a playable range", () => {
    expect(bpmForBeat(0)).toBe(96);
    expect(bpmForBeat(200)).toBeLessThanOrEqual(168);
    expect(bpmForBeat(200)).toBeGreaterThan(bpmForBeat(4));
  });

  it("builds a stable daily seed from the UTC date", () => {
    expect(dailySeed(new Date(Date.UTC(2026, 10, 18, 23, 30)))).toBe(20261118);
  });
});
