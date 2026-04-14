import { describe, expect, it } from "vitest";
import {
  computePlacementScores,
  getMasteredCategories,
  getRecommendedPathSlug,
  type QuestionResult,
} from "../scoring.js";

const PATH_SLUGS = { dev: "dev-path", cybersec: "cybersec-path", network: "network-path" };

// ─── computePlacementScores ───────────────────────────────────────────────────

describe("computePlacementScores", () => {
  it("returns 100 when all answers are correct in each category", () => {
    const results: QuestionResult[] = [
      { category: "DEV", isCorrect: true },
      { category: "DEV", isCorrect: true },
      { category: "CYBERSEC", isCorrect: true },
      { category: "NETWORK", isCorrect: true },
    ];
    expect(computePlacementScores(results)).toEqual({
      devScore: 100,
      cybersecScore: 100,
      networkScore: 100,
    });
  });

  it("returns 0 when all answers are incorrect", () => {
    const results: QuestionResult[] = [
      { category: "DEV", isCorrect: false },
      { category: "CYBERSEC", isCorrect: false },
      { category: "NETWORK", isCorrect: false },
    ];
    expect(computePlacementScores(results)).toEqual({
      devScore: 0,
      cybersecScore: 0,
      networkScore: 0,
    });
  });

  it("rounds to nearest integer", () => {
    // 1/3 = 33.33 → rounds to 33; 2/3 = 66.67 → rounds to 67
    const results: QuestionResult[] = [
      { category: "DEV", isCorrect: true },
      { category: "DEV", isCorrect: false },
      { category: "DEV", isCorrect: false },
    ];
    expect(computePlacementScores(results).devScore).toBe(33);
  });

  it("returns 0 for a category with no questions", () => {
    const results: QuestionResult[] = [{ category: "DEV", isCorrect: true }];
    const scores = computePlacementScores(results);
    expect(scores.cybersecScore).toBe(0);
    expect(scores.networkScore).toBe(0);
  });

  it("returns all zeros for an empty results array", () => {
    expect(computePlacementScores([])).toEqual({
      devScore: 0,
      cybersecScore: 0,
      networkScore: 0,
    });
  });

  it("computes partial scores independently per category", () => {
    const results: QuestionResult[] = [
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
    expect(computePlacementScores(results)).toEqual({
      devScore: 50,
      cybersecScore: 50,
      networkScore: 80,
    });
  });
});

// ─── getMasteredCategories ────────────────────────────────────────────────────

describe("getMasteredCategories", () => {
  it("marks all categories as mastered when all scores are 100", () => {
    expect(getMasteredCategories({ devScore: 100, cybersecScore: 100, networkScore: 100 })).toEqual(
      { DEV: true, CYBERSEC: true, NETWORK: true },
    );
  });

  it("marks no categories as mastered when all scores are 0", () => {
    expect(getMasteredCategories({ devScore: 0, cybersecScore: 0, networkScore: 0 })).toEqual({
      DEV: false,
      CYBERSEC: false,
      NETWORK: false,
    });
  });

  it("marks a category as mastered at exactly the threshold (70)", () => {
    const result = getMasteredCategories({ devScore: 70, cybersecScore: 69, networkScore: 71 });
    expect(result.DEV).toBe(true);
    expect(result.CYBERSEC).toBe(false);
    expect(result.NETWORK).toBe(true);
  });

  it("marks categories independently", () => {
    const result = getMasteredCategories({ devScore: 80, cybersecScore: 50, networkScore: 90 });
    expect(result.DEV).toBe(true);
    expect(result.CYBERSEC).toBe(false);
    expect(result.NETWORK).toBe(true);
  });
});

// ─── getRecommendedPathSlug ───────────────────────────────────────────────────

describe("getRecommendedPathSlug", () => {
  it("returns null when no category is mastered", () => {
    expect(
      getRecommendedPathSlug({ devScore: 0, cybersecScore: 0, networkScore: 0 }, PATH_SLUGS),
    ).toBeNull();
  });

  it("returns null when all scores are below the threshold", () => {
    expect(
      getRecommendedPathSlug({ devScore: 69, cybersecScore: 60, networkScore: 55 }, PATH_SLUGS),
    ).toBeNull();
  });

  it("returns the correct slug for the single mastered category", () => {
    expect(
      getRecommendedPathSlug({ devScore: 80, cybersecScore: 50, networkScore: 40 }, PATH_SLUGS),
    ).toBe("dev-path");

    expect(
      getRecommendedPathSlug({ devScore: 50, cybersecScore: 90, networkScore: 40 }, PATH_SLUGS),
    ).toBe("cybersec-path");

    expect(
      getRecommendedPathSlug({ devScore: 50, cybersecScore: 40, networkScore: 85 }, PATH_SLUGS),
    ).toBe("network-path");
  });

  it("returns the slug for the highest-scoring mastered category when multiple are mastered", () => {
    // CYBERSEC highest
    expect(
      getRecommendedPathSlug({ devScore: 75, cybersecScore: 95, networkScore: 70 }, PATH_SLUGS),
    ).toBe("cybersec-path");

    // DEV highest
    expect(
      getRecommendedPathSlug({ devScore: 90, cybersecScore: 80, networkScore: 70 }, PATH_SLUGS),
    ).toBe("dev-path");

    // NETWORK highest
    expect(
      getRecommendedPathSlug({ devScore: 72, cybersecScore: 70, networkScore: 100 }, PATH_SLUGS),
    ).toBe("network-path");
  });

  it("returns a slug when all three categories are tied at the threshold", () => {
    // Deterministic: whatever wins the sort descending (stable among equal scores)
    const slug = getRecommendedPathSlug(
      { devScore: 70, cybersecScore: 70, networkScore: 70 },
      PATH_SLUGS,
    );
    expect([PATH_SLUGS.dev, PATH_SLUGS.cybersec, PATH_SLUGS.network]).toContain(slug);
  });
});
