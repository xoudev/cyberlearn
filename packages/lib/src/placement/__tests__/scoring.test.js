"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scoring_js_1 = require("../scoring.js");
const PATH_SLUGS = { dev: "dev-path", cybersec: "cybersec-path", network: "network-path" };
// ─── computePlacementScores ───────────────────────────────────────────────────
(0, vitest_1.describe)("computePlacementScores", () => {
  (0, vitest_1.it)("returns 100 when all answers are correct in each category", () => {
    const results = [
      { category: "DEV", isCorrect: true },
      { category: "DEV", isCorrect: true },
      { category: "CYBERSEC", isCorrect: true },
      { category: "NETWORK", isCorrect: true },
    ];
    (0, vitest_1.expect)((0, scoring_js_1.computePlacementScores)(results)).toEqual({
      devScore: 100,
      cybersecScore: 100,
      networkScore: 100,
    });
  });
  (0, vitest_1.it)("returns 0 when all answers are incorrect", () => {
    const results = [
      { category: "DEV", isCorrect: false },
      { category: "CYBERSEC", isCorrect: false },
      { category: "NETWORK", isCorrect: false },
    ];
    (0, vitest_1.expect)((0, scoring_js_1.computePlacementScores)(results)).toEqual({
      devScore: 0,
      cybersecScore: 0,
      networkScore: 0,
    });
  });
  (0, vitest_1.it)("rounds to nearest integer", () => {
    // 1/3 = 33.33 → rounds to 33; 2/3 = 66.67 → rounds to 67
    const results = [
      { category: "DEV", isCorrect: true },
      { category: "DEV", isCorrect: false },
      { category: "DEV", isCorrect: false },
    ];
    (0, vitest_1.expect)((0, scoring_js_1.computePlacementScores)(results).devScore).toBe(33);
  });
  (0, vitest_1.it)("returns 0 for a category with no questions", () => {
    const results = [{ category: "DEV", isCorrect: true }];
    const scores = (0, scoring_js_1.computePlacementScores)(results);
    (0, vitest_1.expect)(scores.cybersecScore).toBe(0);
    (0, vitest_1.expect)(scores.networkScore).toBe(0);
  });
  (0, vitest_1.it)("returns all zeros for an empty results array", () => {
    (0, vitest_1.expect)((0, scoring_js_1.computePlacementScores)([])).toEqual({
      devScore: 0,
      cybersecScore: 0,
      networkScore: 0,
    });
  });
  (0, vitest_1.it)("computes partial scores independently per category", () => {
    const results = [
      { category: "DEV", isCorrect: true },
      { category: "DEV", isCorrect: true },
      { category: "DEV", isCorrect: false },
      { category: "DEV", isCorrect: false },
      { category: "CYBERSEC", isCorrect: true },
      { category: "CYBERSEC", isCorrect: false },
      { category: "NETWORK", isCorrect: true },
      { category: "NETWORK", isCorrect: true },
      { category: "NETWORK", isCorrect: true },
      { category: "NETWORK", isCorrect: true },
      { category: "NETWORK", isCorrect: false },
    ];
    (0, vitest_1.expect)((0, scoring_js_1.computePlacementScores)(results)).toEqual({
      devScore: 50,
      cybersecScore: 50,
      networkScore: 80,
    });
  });
});
// ─── getMasteredCategories ────────────────────────────────────────────────────
(0, vitest_1.describe)("getMasteredCategories", () => {
  (0, vitest_1.it)("marks all categories as mastered when all scores are 100", () => {
    (0, vitest_1.expect)(
      (0, scoring_js_1.getMasteredCategories)({
        devScore: 100,
        cybersecScore: 100,
        networkScore: 100,
      }),
    ).toEqual({ DEV: true, CYBERSEC: true, NETWORK: true });
  });
  (0, vitest_1.it)("marks no categories as mastered when all scores are 0", () => {
    (0, vitest_1.expect)(
      (0, scoring_js_1.getMasteredCategories)({ devScore: 0, cybersecScore: 0, networkScore: 0 }),
    ).toEqual({
      DEV: false,
      CYBERSEC: false,
      NETWORK: false,
    });
  });
  (0, vitest_1.it)("marks a category as mastered at exactly the threshold (70)", () => {
    const result = (0, scoring_js_1.getMasteredCategories)({
      devScore: 70,
      cybersecScore: 69,
      networkScore: 71,
    });
    (0, vitest_1.expect)(result.DEV).toBe(true);
    (0, vitest_1.expect)(result.CYBERSEC).toBe(false);
    (0, vitest_1.expect)(result.NETWORK).toBe(true);
  });
  (0, vitest_1.it)("marks categories independently", () => {
    const result = (0, scoring_js_1.getMasteredCategories)({
      devScore: 80,
      cybersecScore: 50,
      networkScore: 90,
    });
    (0, vitest_1.expect)(result.DEV).toBe(true);
    (0, vitest_1.expect)(result.CYBERSEC).toBe(false);
    (0, vitest_1.expect)(result.NETWORK).toBe(true);
  });
});
// ─── getRecommendedPathSlug ───────────────────────────────────────────────────
(0, vitest_1.describe)("getRecommendedPathSlug", () => {
  (0, vitest_1.it)("returns null when no category is mastered", () => {
    (0, vitest_1.expect)(
      (0, scoring_js_1.getRecommendedPathSlug)(
        { devScore: 0, cybersecScore: 0, networkScore: 0 },
        PATH_SLUGS,
      ),
    ).toBeNull();
  });
  (0, vitest_1.it)("returns null when all scores are below the threshold", () => {
    (0, vitest_1.expect)(
      (0, scoring_js_1.getRecommendedPathSlug)(
        { devScore: 69, cybersecScore: 60, networkScore: 55 },
        PATH_SLUGS,
      ),
    ).toBeNull();
  });
  (0, vitest_1.it)("returns the correct slug for the single mastered category", () => {
    (0, vitest_1.expect)(
      (0, scoring_js_1.getRecommendedPathSlug)(
        { devScore: 80, cybersecScore: 50, networkScore: 40 },
        PATH_SLUGS,
      ),
    ).toBe("dev-path");
    (0, vitest_1.expect)(
      (0, scoring_js_1.getRecommendedPathSlug)(
        { devScore: 50, cybersecScore: 90, networkScore: 40 },
        PATH_SLUGS,
      ),
    ).toBe("cybersec-path");
    (0, vitest_1.expect)(
      (0, scoring_js_1.getRecommendedPathSlug)(
        { devScore: 50, cybersecScore: 40, networkScore: 85 },
        PATH_SLUGS,
      ),
    ).toBe("network-path");
  });
  (0, vitest_1.it)(
    "returns the slug for the highest-scoring mastered category when multiple are mastered",
    () => {
      // CYBERSEC highest
      (0, vitest_1.expect)(
        (0, scoring_js_1.getRecommendedPathSlug)(
          { devScore: 75, cybersecScore: 95, networkScore: 70 },
          PATH_SLUGS,
        ),
      ).toBe("cybersec-path");
      // DEV highest
      (0, vitest_1.expect)(
        (0, scoring_js_1.getRecommendedPathSlug)(
          { devScore: 90, cybersecScore: 80, networkScore: 70 },
          PATH_SLUGS,
        ),
      ).toBe("dev-path");
      // NETWORK highest
      (0, vitest_1.expect)(
        (0, scoring_js_1.getRecommendedPathSlug)(
          { devScore: 72, cybersecScore: 70, networkScore: 100 },
          PATH_SLUGS,
        ),
      ).toBe("network-path");
    },
  );
  (0, vitest_1.it)("returns a slug when all three categories are tied at the threshold", () => {
    // Deterministic: whatever wins the sort descending (stable among equal scores)
    const slug = (0, scoring_js_1.getRecommendedPathSlug)(
      { devScore: 70, cybersecScore: 70, networkScore: 70 },
      PATH_SLUGS,
    );
    (0, vitest_1.expect)([PATH_SLUGS.dev, PATH_SLUGS.cybersec, PATH_SLUGS.network]).toContain(slug);
  });
});
//# sourceMappingURL=scoring.test.js.map
