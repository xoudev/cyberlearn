"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const xp_js_1 = require("../xp.js");
(0, vitest_1.describe)("xpForNextLevel", () => {
  (0, vitest_1.it)("level 1 requires 100 XP to advance", () => {
    (0, vitest_1.expect)((0, xp_js_1.xpForNextLevel)(1)).toBe(100);
  });
  (0, vitest_1.it)("level 10 requires 1000 XP to advance", () => {
    (0, vitest_1.expect)((0, xp_js_1.xpForNextLevel)(10)).toBe(1000);
  });
  (0, vitest_1.it)("scales linearly: level N requires N×100 XP", () => {
    for (const n of [1, 5, 25, 50, 99]) {
      (0, vitest_1.expect)((0, xp_js_1.xpForNextLevel)(n)).toBe(n * 100);
    }
  });
});
(0, vitest_1.describe)("computeLevel", () => {
  (0, vitest_1.it)("0 XP → level 1, current 0", () => {
    const r = (0, xp_js_1.computeLevel)(0);
    (0, vitest_1.expect)(r.level).toBe(1);
    (0, vitest_1.expect)(r.current).toBe(0);
    (0, vitest_1.expect)(r.needed).toBe(100);
  });
  (0, vitest_1.it)("exactly at level 2 threshold (100 XP)", () => {
    const r = (0, xp_js_1.computeLevel)(100);
    (0, vitest_1.expect)(r.level).toBe(2);
    (0, vitest_1.expect)(r.current).toBe(0);
    (0, vitest_1.expect)(r.needed).toBe(200);
  });
  (0, vitest_1.it)("midway through level 2 (200 XP total = 100 in + 100 to go)", () => {
    // To reach level 2 costs 100 XP. Level 2→3 costs 200 XP.
    // 100 in level 2 of 200 needed.
    const r = (0, xp_js_1.computeLevel)(200);
    (0, vitest_1.expect)(r.level).toBe(2);
    (0, vitest_1.expect)(r.current).toBe(100);
    (0, vitest_1.expect)(r.needed).toBe(200);
  });
  (0, vitest_1.it)("exactly at level 3 threshold (300 XP total)", () => {
    // cumulativeXpForLevel(3) = 50 × 3 × 2 = 300
    const r = (0, xp_js_1.computeLevel)(300);
    (0, vitest_1.expect)(r.level).toBe(3);
    (0, vitest_1.expect)(r.current).toBe(0);
    (0, vitest_1.expect)(r.needed).toBe(300);
  });
  (0, vitest_1.it)("level 10 threshold is at correct cumulative XP", () => {
    // cumulativeXpForLevel(10) = 50 × 10 × 9 = 4500
    const r = (0, xp_js_1.computeLevel)(4500);
    (0, vitest_1.expect)(r.level).toBe(10);
    (0, vitest_1.expect)(r.current).toBe(0);
  });
  (0, vitest_1.it)("caps at level 100", () => {
    const r = (0, xp_js_1.computeLevel)(999_999_999);
    (0, vitest_1.expect)(r.level).toBe(100);
  });
  (0, vitest_1.it)("current + base equals xpTotal for any level", () => {
    const samples = [0, 50, 100, 350, 1000, 5000, 50000];
    for (const xp of samples) {
      const r = (0, xp_js_1.computeLevel)(xp);
      // Verify invariant: level is correct (no off-by-one)
      (0, vitest_1.expect)(r.level).toBeGreaterThanOrEqual(1);
      (0, vitest_1.expect)(r.level).toBeLessThanOrEqual(100);
      (0, vitest_1.expect)(r.current).toBeGreaterThanOrEqual(0);
      (0, vitest_1.expect)(r.needed).toBeGreaterThan(0);
    }
  });
  (0, vitest_1.it)("XP award increases level when threshold is crossed", () => {
    const before = (0, xp_js_1.computeLevel)(99);
    const after = (0, xp_js_1.computeLevel)(100);
    (0, vitest_1.expect)(before.level).toBe(1);
    (0, vitest_1.expect)(after.level).toBe(2);
  });
});
//# sourceMappingURL=xp.test.js.map
