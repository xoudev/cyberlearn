import { describe, expect, it } from "vitest";
import {
  buildBadgeCriterionStats,
  computeBadgeProgress,
  evaluateBadges,
  type BadgeCriterionStats,
} from "../badge-evaluator.js";

// ── Type helpers ─────────────────────────────────────────────────────────────
// Extract the Badge type from the function signature to avoid cross-package imports.
type AnyBadge = Parameters<typeof evaluateBadges>[0][number];

function makeBadge(
  id: string,
  criterionType: string,
  criterionData: unknown,
  active = true,
): AnyBadge {
  return {
    id,
    criterionType,
    criterionData,
    isActive: active,
  };
}

const BASE_STATS: BadgeCriterionStats = {
  xpTotal: 0,
  level: 1,
  streakDays: 0,
  totalLessonsCompleted: 0,
  categoryLessonCounts: {},
  completedLessonIds: new Set(),
  completedPathsCount: 0,
  completedPathIds: new Set(),
  totalCertificates: 0,
  perfectQuizCount: 0,
  placementMasteredCount: 0,
  earnedBadgeRefCodes: new Set(),
};

// ── buildBadgeCriterionStats ──────────────────────────────────────────────────

describe("buildBadgeCriterionStats", () => {
  it("derives counts, category buckets and sets from raw facts", () => {
    const stats = buildBadgeCriterionStats(
      {
        completedLessons: [
          { lessonId: "l1", category: "DEV" },
          { lessonId: "l2", category: "DEV" },
          { lessonId: "l3", category: "CYBERSEC" },
        ],
        completedPathIds: ["p1", "p2"],
        totalCertificates: 1,
        perfectQuizCount: 2,
        earnedBadgeRefCodes: ["CL-BDG-001"],
        placementScores: null,
      },
      { xpTotal: 250, streakDays: 4 },
    );

    expect(stats.xpTotal).toBe(250);
    expect(stats.streakDays).toBe(4);
    expect(stats.totalLessonsCompleted).toBe(3);
    expect(stats.categoryLessonCounts).toEqual({ DEV: 2, CYBERSEC: 1 });
    expect(stats.completedLessonIds.has("l2")).toBe(true);
    expect(stats.completedPathsCount).toBe(2);
    expect(stats.completedPathIds.has("p2")).toBe(true);
    expect(stats.totalCertificates).toBe(1);
    expect(stats.perfectQuizCount).toBe(2);
    expect(stats.placementMasteredCount).toBe(0);
    expect(stats.level).toBe(2); // 250 XP → level 2
    expect(stats.earnedBadgeRefCodes.has("CL-BDG-001")).toBe(true);
  });

  it("derives placementMasteredCount from scores using the mastery threshold (70)", () => {
    const stats = buildBadgeCriterionStats(
      {
        completedLessons: [],
        completedPathIds: [],
        totalCertificates: 0,
        perfectQuizCount: 0,
        earnedBadgeRefCodes: [],
        placementScores: { devScore: 80, cybersecScore: 60, networkScore: 70 },
      },
      { xpTotal: 0, streakDays: 0 },
    );
    // DEV (80) and NETWORK (70) reach the threshold, CYBERSEC (60) does not.
    expect(stats.placementMasteredCount).toBe(2);
  });
});

// ── LESSON_COMPLETED (parity with the previous evaluator) ────────────────────

describe("LESSON_COMPLETED criterion", () => {
  it("awards badge when totalLessonsCompleted meets threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 5 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      totalLessonsCompleted: 5,
    });
    expect(result).toEqual(["b1"]);
  });

  it("does not award when below threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 5 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      totalLessonsCompleted: 4,
    });
    expect(result).toHaveLength(0);
  });

  it("awards when totalLessonsCompleted exceeds threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 3 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      totalLessonsCompleted: 10,
    });
    expect(result).toEqual(["b1"]);
  });

  it("reports capped progress", () => {
    expect(
      computeBadgeProgress(
        "LESSON_COMPLETED",
        { count: 5 },
        { ...BASE_STATS, totalLessonsCompleted: 3 },
      ),
    ).toEqual({ done: 3, total: 5 });
    expect(
      computeBadgeProgress(
        "LESSON_COMPLETED",
        { count: 5 },
        { ...BASE_STATS, totalLessonsCompleted: 9 },
      ),
    ).toEqual({ done: 5, total: 5 });
  });

  // BEHAVIOUR CHANGE (intentional): the old evaluator treated a missing count
  // as 0 and awarded the badge to everyone. Misconfigured data now never awards.
  it("never awards on missing or non-positive count (misconfigured badge)", () => {
    for (const data of [{}, { count: 0 }, { count: -2 }, { count: "5" }, null]) {
      const badge = makeBadge("b1", "LESSON_COMPLETED", data);
      expect(
        evaluateBadges([badge], new Set(), { ...BASE_STATS, totalLessonsCompleted: 100 }),
      ).toHaveLength(0);
      expect(computeBadgeProgress("LESSON_COMPLETED", data, BASE_STATS)).toBeNull();
    }
  });
});

// ── XP_THRESHOLD (parity) ─────────────────────────────────────────────────────

describe("XP_THRESHOLD criterion", () => {
  it("awards badge when xpTotal meets threshold", () => {
    const badge = makeBadge("b2", "XP_THRESHOLD", { threshold: 500 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, xpTotal: 500 });
    expect(result).toEqual(["b2"]);
  });

  it("does not award when below threshold", () => {
    const badge = makeBadge("b2", "XP_THRESHOLD", { threshold: 500 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, xpTotal: 499 });
    expect(result).toHaveLength(0);
  });

  it("never awards on missing threshold (misconfigured badge)", () => {
    const badge = makeBadge("b2", "XP_THRESHOLD", {});
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, xpTotal: 99999 });
    expect(result).toHaveLength(0);
  });
});

// ── STREAK_DAYS (parity) ──────────────────────────────────────────────────────

describe("STREAK_DAYS criterion", () => {
  it("awards badge when streakDays meets threshold", () => {
    const badge = makeBadge("b3", "STREAK_DAYS", { days: 7 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, streakDays: 7 });
    expect(result).toEqual(["b3"]);
  });

  it("does not award when below threshold", () => {
    const badge = makeBadge("b3", "STREAK_DAYS", { days: 7 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, streakDays: 6 });
    expect(result).toHaveLength(0);
  });

  it("never awards on missing days (misconfigured badge)", () => {
    const badge = makeBadge("b3", "STREAK_DAYS", {});
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, streakDays: 365 });
    expect(result).toHaveLength(0);
  });
});

// ── CATEGORY_MASTERY - single category (parity) ───────────────────────────────

describe("CATEGORY_MASTERY criterion - {category, count}", () => {
  it("awards badge when category count meets threshold", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "CYBERSEC", count: 10 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      categoryLessonCounts: { CYBERSEC: 10 },
    });
    expect(result).toEqual(["b4"]);
  });

  it("does not award when category count is below threshold", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "CYBERSEC", count: 10 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      categoryLessonCounts: { CYBERSEC: 9 },
    });
    expect(result).toHaveLength(0);
  });

  it("does not award when category is missing from counts", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "NETWORK", count: 5 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      categoryLessonCounts: {},
    });
    expect(result).toHaveLength(0);
  });

  it("does not award when count criterion is 0 (misconfigured badge)", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "DEV", count: 0 });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      categoryLessonCounts: { DEV: 100 },
    });
    expect(result).toHaveLength(0);
  });
});

// ── CATEGORY_MASTERY - multi category (NEW: the seeded "Explorateur" shape) ───

describe("CATEGORY_MASTERY criterion - {categories: [...]}", () => {
  const badge = makeBadge("b4m", "CATEGORY_MASTERY", {
    categories: ["DEV", "CYBERSEC", "NETWORK"],
  });

  it("awards when at least one lesson is completed in EACH listed category", () => {
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      categoryLessonCounts: { DEV: 1, CYBERSEC: 3, NETWORK: 1 },
    });
    expect(result).toEqual(["b4m"]);
  });

  it("does not award while a listed category has no completed lesson", () => {
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      categoryLessonCounts: { DEV: 5, CYBERSEC: 5 },
    });
    expect(result).toHaveLength(0);
  });

  it("reports per-category progress", () => {
    expect(
      computeBadgeProgress("CATEGORY_MASTERY", badge.criterionData, {
        ...BASE_STATS,
        categoryLessonCounts: { DEV: 2, NETWORK: 1 },
      }),
    ).toEqual({ done: 2, total: 3 });
  });

  it("treats an empty or non-string array as misconfigured", () => {
    expect(computeBadgeProgress("CATEGORY_MASTERY", { categories: [] }, BASE_STATS)).toBeNull();
    expect(computeBadgeProgress("CATEGORY_MASTERY", { categories: [1, 2] }, BASE_STATS)).toBeNull();
  });
});

// ── PATH_COMPLETED - withCertificate ──────────────────────────────────────────

describe("PATH_COMPLETED criterion - {withCertificate: true}", () => {
  const badge = makeBadge("b5c", "PATH_COMPLETED", { withCertificate: true });

  it("awards once the user holds at least one certificate", () => {
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, totalCertificates: 1 });
    expect(result).toEqual(["b5c"]);
  });

  it("does not award without a certificate, even with completed paths", () => {
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedPathsCount: 3,
      completedPathIds: new Set(["p1", "p2", "p3"]),
    });
    expect(result).toHaveLength(0);
  });
});

// ── PATH_COMPLETED - specific path ({pathId}) ─────────────────────────────────

describe("PATH_COMPLETED criterion - {pathId}", () => {
  const badge = makeBadge("b5p", "PATH_COMPLETED", { pathId: "path-abc" });

  it("awards when that specific path is completed", () => {
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedPathsCount: 1,
      completedPathIds: new Set(["path-abc"]),
    });
    expect(result).toEqual(["b5p"]);
  });

  it("does not award when no path completed", () => {
    const result = evaluateBadges([badge], new Set(), BASE_STATS);
    expect(result).toHaveLength(0);
  });

  // BEHAVIOUR CHANGE (intentional): the retroactive path previously ignored
  // pathId and awarded after ANY completed path.
  it("does not award when only other paths are completed", () => {
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedPathsCount: 2,
      completedPathIds: new Set(["path-other", "path-zzz"]),
    });
    expect(result).toHaveLength(0);
  });
});

// ── PATH_COMPLETED - count mode ({count} / {} / {pathId: ""}) ─────────────────

describe("PATH_COMPLETED criterion - count mode", () => {
  it("empty pathId means any path (historical behaviour preserved)", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "" });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedPathsCount: 1,
      completedPathIds: new Set(["path-xyz"]),
    });
    expect(result).toEqual(["b5"]);
  });

  it("empty criterionData defaults to one path (the seeded Architecte shape)", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { count: 1 });
    expect(
      evaluateBadges([badge], new Set(), {
        ...BASE_STATS,
        completedPathsCount: 1,
        completedPathIds: new Set(["p1"]),
      }),
    ).toEqual(["b5"]);
    expect(evaluateBadges([badge], new Set(), BASE_STATS)).toHaveLength(0);
  });

  // BEHAVIOUR CHANGE (intentional): the real-time evaluator previously ignored
  // count entirely and unlocked "N paths" badges on the FIRST completed path.
  it("requires the full count of completed paths", () => {
    const badge = makeBadge("b5n", "PATH_COMPLETED", { count: 3 });
    const at1 = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedPathsCount: 1,
      completedPathIds: new Set(["p1"]),
    });
    expect(at1).toHaveLength(0);

    const at3 = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedPathsCount: 3,
      completedPathIds: new Set(["p1", "p2", "p3"]),
    });
    expect(at3).toEqual(["b5n"]);
  });

  it("null criterionData behaves like {} (any one path) without throwing", () => {
    // The old evaluator crashed on null criterionData (unguarded cast).
    const badge = makeBadge("b5x", "PATH_COMPLETED", null);
    expect(
      evaluateBadges([badge], new Set(), {
        ...BASE_STATS,
        completedPathsCount: 1,
        completedPathIds: new Set(["p1"]),
      }),
    ).toEqual(["b5x"]);
  });
});

// ── LESSON_SPECIFIC (previously untested) ─────────────────────────────────────

describe("LESSON_SPECIFIC criterion", () => {
  const badge = makeBadge("b6l", "LESSON_SPECIFIC", { lessonId: "lesson-42" });

  it("awards when the lesson is in the completed history", () => {
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedLessonIds: new Set(["lesson-42"]),
    });
    expect(result).toEqual(["b6l"]);
  });

  it("does not award when the lesson is not completed", () => {
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      completedLessonIds: new Set(["lesson-1"]),
    });
    expect(result).toHaveLength(0);
    expect(computeBadgeProgress("LESSON_SPECIFIC", badge.criterionData, BASE_STATS)).toEqual({
      done: 0,
      total: 1,
    });
  });

  it("treats a missing lessonId as misconfigured", () => {
    expect(computeBadgeProgress("LESSON_SPECIFIC", {}, BASE_STATS)).toBeNull();
  });
});

// ── PERFECT_QUIZ ──────────────────────────────────────────────────────────────

describe("PERFECT_QUIZ criterion", () => {
  // BEHAVIOUR CHANGE (badge event hooks): previously always null, awarded by
  // nothing. Now driven by perfectQuizCount with {count} (default 1).
  it("awards when the perfect-quiz count reaches the target", () => {
    const badge = makeBadge("b6", "PERFECT_QUIZ", { count: 3 });
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, perfectQuizCount: 3 });
    expect(result).toEqual(["b6"]);
  });

  it("reports partial progress below the target", () => {
    expect(
      computeBadgeProgress("PERFECT_QUIZ", { count: 3 }, { ...BASE_STATS, perfectQuizCount: 1 }),
    ).toEqual({ done: 1, total: 3 });
  });

  it("defaults to count 1 for {} (one perfect quiz unlocks)", () => {
    const badge = makeBadge("b6", "PERFECT_QUIZ", {});
    expect(evaluateBadges([badge], new Set(), BASE_STATS)).toHaveLength(0);
    expect(evaluateBadges([badge], new Set(), { ...BASE_STATS, perfectQuizCount: 1 })).toEqual([
      "b6",
    ]);
  });

  it("treats a non-positive count as misconfigured", () => {
    expect(
      computeBadgeProgress("PERFECT_QUIZ", { count: 0 }, { ...BASE_STATS, perfectQuizCount: 9 }),
    ).toBeNull();
  });
});

// ── CUSTOM ────────────────────────────────────────────────────────────────────

describe("CUSTOM criterion", () => {
  // BEHAVIOUR CHANGE (badge event hooks): previously always null. The
  // placement_test_passed event is now wired: ≥ 1 mastered category unlocks.
  it("awards placement_test_passed when at least one category is mastered", () => {
    const badge = makeBadge("b7", "CUSTOM", { event: "placement_test_passed" });
    const result = evaluateBadges([badge], new Set(), {
      ...BASE_STATS,
      placementMasteredCount: 1,
    });
    expect(result).toEqual(["b7"]);
  });

  it("does not award placement_test_passed without a mastered category", () => {
    const badge = makeBadge("b7", "CUSTOM", { event: "placement_test_passed" });
    expect(evaluateBadges([badge], new Set(), BASE_STATS)).toHaveLength(0);
    expect(computeBadgeProgress("CUSTOM", { event: "placement_test_passed" }, BASE_STATS)).toEqual({
      done: 0,
      total: 1,
    });
  });

  it("never awards an unknown or missing event", () => {
    const stats = { ...BASE_STATS, placementMasteredCount: 3, xpTotal: 99999 };
    expect(computeBadgeProgress("CUSTOM", { event: "some_future_event" }, stats)).toBeNull();
    expect(computeBadgeProgress("CUSTOM", {}, stats)).toBeNull();
    expect(computeBadgeProgress("CUSTOM", null, stats)).toBeNull();
  });
});

// ── LEVEL ─────────────────────────────────────────────────────────────────────

describe("LEVEL criterion", () => {
  it("tracks progress toward a target level", () => {
    expect(computeBadgeProgress("LEVEL", { level: 20 }, { ...BASE_STATS, level: 12 })).toEqual({
      done: 12,
      total: 20,
    });
  });
  it("unlocks at or above the target level", () => {
    const badge = makeBadge("lv", "LEVEL", { level: 20 });
    expect(evaluateBadges([badge], new Set(), { ...BASE_STATS, level: 20 })).toEqual(["lv"]);
    expect(evaluateBadges([badge], new Set(), { ...BASE_STATS, level: 19 })).toHaveLength(0);
  });
  it("is misconfigured when level is missing or <= 0", () => {
    expect(computeBadgeProgress("LEVEL", {}, BASE_STATS)).toBeNull();
    expect(computeBadgeProgress("LEVEL", { level: 0 }, BASE_STATS)).toBeNull();
  });
});

// ── BADGE_EARNED ───────────────────────────────────────────────────────────────

describe("BADGE_EARNED criterion", () => {
  it("unlocks when the referenced badge is earned", () => {
    const stats = { ...BASE_STATS, earnedBadgeRefCodes: new Set(["CL-BDG-007"]) };
    const badge = makeBadge("be", "BADGE_EARNED", { badgeRefCode: "CL-BDG-007" });
    expect(evaluateBadges([badge], new Set(), stats)).toEqual(["be"]);
  });
  it("stays locked without the badge", () => {
    const badge = makeBadge("be", "BADGE_EARNED", { badgeRefCode: "CL-BDG-007" });
    expect(evaluateBadges([badge], new Set(), BASE_STATS)).toHaveLength(0);
  });
  it("is misconfigured without a badgeRefCode", () => {
    expect(computeBadgeProgress("BADGE_EARNED", {}, BASE_STATS)).toBeNull();
  });
});

// ── Already-earned / inactive guards (parity) ─────────────────────────────────

describe("already-earned and inactive guards", () => {
  it("does not re-award an already-earned badge", () => {
    const badge = makeBadge("b8", "XP_THRESHOLD", { threshold: 100 });
    const result = evaluateBadges([badge], new Set(["b8"]), { ...BASE_STATS, xpTotal: 9999 });
    expect(result).toHaveLength(0);
  });

  it("does not award an inactive badge", () => {
    const badge = makeBadge("b9", "XP_THRESHOLD", { threshold: 1 }, false);
    const result = evaluateBadges([badge], new Set(), { ...BASE_STATS, xpTotal: 100 });
    expect(result).toHaveLength(0);
  });

  it("awards only badges not already earned from a mixed list", () => {
    const earned = makeBadge("earned", "XP_THRESHOLD", { threshold: 10 });
    const pending = makeBadge("pending", "XP_THRESHOLD", { threshold: 10 });
    const result = evaluateBadges([earned, pending], new Set(["earned"]), {
      ...BASE_STATS,
      xpTotal: 100,
    });
    expect(result).toEqual(["pending"]);
  });

  it("returns multiple newly-earned badges at once", () => {
    const a = makeBadge("a", "XP_THRESHOLD", { threshold: 100 });
    const b = makeBadge("b", "LESSON_COMPLETED", { count: 1 });
    const c = makeBadge("c", "STREAK_DAYS", { days: 1 });
    const result = evaluateBadges([a, b, c], new Set(), {
      ...BASE_STATS,
      xpTotal: 200,
      streakDays: 3,
      totalLessonsCompleted: 5,
    });
    expect(result.sort()).toEqual(["a", "b", "c"]);
  });
});
