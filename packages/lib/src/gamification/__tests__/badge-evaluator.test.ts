import { describe, expect, it } from "vitest";
import { evaluateBadges, type BadgeEvaluationContext } from "../badge-evaluator.js";

// ── Type helpers ─────────────────────────────────────────────────────────────
// Extract the Badge type from the function signature to avoid cross-package imports.
type AnyBadge = Parameters<typeof evaluateBadges>[0][number];

function makeBadge(
  id: string,
  criterionType: string,
  criterionData: Record<string, unknown>,
  active = true,
): AnyBadge {
  return {
    id,
    criterionType,
    criterionData,
    isActive: active,
  };
}

const BASE_CTX: BadgeEvaluationContext = {
  xpTotal: 0,
  streakDays: 0,
  totalLessonsCompleted: 0,
  categoryLessonCounts: {},
};

// ── LESSON_COMPLETED ──────────────────────────────────────────────────────────

describe("LESSON_COMPLETED criterion", () => {
  it("awards badge when totalLessonsCompleted meets threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 5 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, totalLessonsCompleted: 5 });
    expect(result).toEqual(["b1"]);
  });

  it("does not award when below threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 5 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, totalLessonsCompleted: 4 });
    expect(result).toHaveLength(0);
  });

  it("awards when totalLessonsCompleted exceeds threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 3 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, totalLessonsCompleted: 10 });
    expect(result).toEqual(["b1"]);
  });
});

// ── XP_THRESHOLD ──────────────────────────────────────────────────────────────

describe("XP_THRESHOLD criterion", () => {
  it("awards badge when xpTotal meets threshold", () => {
    const badge = makeBadge("b2", "XP_THRESHOLD", { threshold: 500 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, xpTotal: 500 });
    expect(result).toEqual(["b2"]);
  });

  it("does not award when below threshold", () => {
    const badge = makeBadge("b2", "XP_THRESHOLD", { threshold: 500 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, xpTotal: 499 });
    expect(result).toHaveLength(0);
  });
});

// ── STREAK_DAYS ───────────────────────────────────────────────────────────────

describe("STREAK_DAYS criterion", () => {
  it("awards badge when streakDays meets threshold", () => {
    const badge = makeBadge("b3", "STREAK_DAYS", { days: 7 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, streakDays: 7 });
    expect(result).toEqual(["b3"]);
  });

  it("does not award when below threshold", () => {
    const badge = makeBadge("b3", "STREAK_DAYS", { days: 7 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, streakDays: 6 });
    expect(result).toHaveLength(0);
  });
});

// ── CATEGORY_MASTERY ──────────────────────────────────────────────────────────

describe("CATEGORY_MASTERY criterion", () => {
  it("awards badge when category count meets threshold", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "CYBERSEC", count: 10 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_CTX,
      categoryLessonCounts: { CYBERSEC: 10 },
    });
    expect(result).toEqual(["b4"]);
  });

  it("does not award when category count is below threshold", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "CYBERSEC", count: 10 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_CTX,
      categoryLessonCounts: { CYBERSEC: 9 },
    });
    expect(result).toHaveLength(0);
  });

  it("does not award when category is missing from counts", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "NETWORK", count: 5 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, categoryLessonCounts: {} });
    expect(result).toHaveLength(0);
  });

  it("does not award when count criterion is 0 (misconfigured badge)", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "DEV", count: 0 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_CTX,
      categoryLessonCounts: { DEV: 100 },
    });
    expect(result).toHaveLength(0);
  });
});

// ── PATH_COMPLETED ────────────────────────────────────────────────────────────

describe("PATH_COMPLETED criterion", () => {
  it("awards badge when completedPathId matches", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "path-abc" });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_CTX,
      completedPathId: "path-abc",
    });
    expect(result).toEqual(["b5"]);
  });

  it("awards badge with empty pathId (any path completes it)", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "" });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_CTX,
      completedPathId: "path-xyz",
    });
    expect(result).toEqual(["b5"]);
  });

  it("does not award when no path completed", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "path-abc" });
    const result = evaluateBadges([badge], new Set(), BASE_CTX);
    expect(result).toHaveLength(0);
  });

  it("does not award when completedPathId does not match required pathId", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "path-abc" });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_CTX,
      completedPathId: "path-other",
    });
    expect(result).toHaveLength(0);
  });
});

// ── PERFECT_QUIZ / CUSTOM ─────────────────────────────────────────────────────

describe("PERFECT_QUIZ and CUSTOM criteria", () => {
  it("never auto-awards PERFECT_QUIZ (manual award only)", () => {
    const badge = makeBadge("b6", "PERFECT_QUIZ", {});
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, xpTotal: 99999 });
    expect(result).toHaveLength(0);
  });

  it("never auto-awards CUSTOM (manual award only)", () => {
    const badge = makeBadge("b7", "CUSTOM", {});
    const result = evaluateBadges([badge], new Set(), { ...BASE_CTX, xpTotal: 99999 });
    expect(result).toHaveLength(0);
  });
});

// ── Already-earned / inactive guards ─────────────────────────────────────────

describe("already-earned and inactive guards", () => {
  it("does not re-award an already-earned badge", () => {
    const badge = makeBadge("b8", "XP_THRESHOLD", { threshold: 100 });
    const result = evaluateBadges([badge], new Set(["b8"]), { ...BASE_CTX, xpTotal: 9999 });
    expect(result).toHaveLength(0);
  });

  it("does not award an inactive badge", () => {
    const badge = makeBadge("b9", "XP_THRESHOLD", { threshold: 0 }, false);
    const result = evaluateBadges([badge], new Set(), BASE_CTX);
    expect(result).toHaveLength(0);
  });

  it("awards only badges not already earned from a mixed list", () => {
    const earned = makeBadge("earned", "XP_THRESHOLD", { threshold: 10 });
    const pending = makeBadge("pending", "XP_THRESHOLD", { threshold: 10 });
    const result = evaluateBadges([earned, pending], new Set(["earned"]), {
      ...BASE_CTX,
      xpTotal: 100,
    });
    expect(result).toEqual(["pending"]);
  });

  it("returns multiple newly-earned badges at once", () => {
    const a = makeBadge("a", "XP_THRESHOLD", { threshold: 100 });
    const b = makeBadge("b", "LESSON_COMPLETED", { count: 1 });
    const c = makeBadge("c", "STREAK_DAYS", { days: 1 });
    const result = evaluateBadges([a, b, c], new Set(), {
      xpTotal: 200,
      streakDays: 3,
      totalLessonsCompleted: 5,
      categoryLessonCounts: {},
    });
    expect(result.sort()).toEqual(["a", "b", "c"]);
  });
});
