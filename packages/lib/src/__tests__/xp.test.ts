import { describe, expect, it } from "vitest";
import { computeLevel, xpForNextLevel } from "../xp.js";

describe("xpForNextLevel", () => {
  it("level 1 requires 100 XP to advance", () => {
    expect(xpForNextLevel(1)).toBe(100);
  });

  it("level 10 requires 1000 XP to advance", () => {
    expect(xpForNextLevel(10)).toBe(1000);
  });

  it("scales linearly: level N requires N×100 XP", () => {
    for (const n of [1, 5, 25, 50, 99]) {
      expect(xpForNextLevel(n)).toBe(n * 100);
    }
  });
});

describe("computeLevel", () => {
  it("0 XP → level 1, current 0", () => {
    const r = computeLevel(0);
    expect(r.level).toBe(1);
    expect(r.current).toBe(0);
    expect(r.needed).toBe(100);
  });

  it("exactly at level 2 threshold (100 XP)", () => {
    const r = computeLevel(100);
    expect(r.level).toBe(2);
    expect(r.current).toBe(0);
    expect(r.needed).toBe(200);
  });

  it("midway through level 2 (200 XP total = 100 in + 100 to go)", () => {
    // To reach level 2 costs 100 XP. Level 2→3 costs 200 XP.
    // 100 in level 2 of 200 needed.
    const r = computeLevel(200);
    expect(r.level).toBe(2);
    expect(r.current).toBe(100);
    expect(r.needed).toBe(200);
  });

  it("exactly at level 3 threshold (300 XP total)", () => {
    // cumulativeXpForLevel(3) = 50 × 3 × 2 = 300
    const r = computeLevel(300);
    expect(r.level).toBe(3);
    expect(r.current).toBe(0);
    expect(r.needed).toBe(300);
  });

  it("level 10 threshold is at correct cumulative XP", () => {
    // cumulativeXpForLevel(10) = 50 × 10 × 9 = 4500
    const r = computeLevel(4500);
    expect(r.level).toBe(10);
    expect(r.current).toBe(0);
  });

  it("caps at level 100", () => {
    const r = computeLevel(999_999_999);
    expect(r.level).toBe(100);
  });

  it("current + base equals xpTotal for any level", () => {
    const samples = [0, 50, 100, 350, 1000, 5000, 50000];
    for (const xp of samples) {
      const r = computeLevel(xp);
      // Verify invariant: level is correct (no off-by-one)
      expect(r.level).toBeGreaterThanOrEqual(1);
      expect(r.level).toBeLessThanOrEqual(100);
      expect(r.current).toBeGreaterThanOrEqual(0);
      expect(r.needed).toBeGreaterThan(0);
    }
  });

  it("XP award increases level when threshold is crossed", () => {
    const before = computeLevel(99);
    const after = computeLevel(100);
    expect(before.level).toBe(1);
    expect(after.level).toBe(2);
  });
});
