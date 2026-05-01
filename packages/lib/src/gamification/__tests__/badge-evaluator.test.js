"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const badge_evaluator_js_1 = require("../badge-evaluator.js");
function makeBadge(id, criterionType, criterionData, active = true) {
  return {
    id,
    criterionType,
    criterionData,
    isActive: active,
  };
}
const BASE_CTX = {
  xpTotal: 0,
  streakDays: 0,
  totalLessonsCompleted: 0,
  categoryLessonCounts: {},
};
// ── LESSON_COMPLETED ──────────────────────────────────────────────────────────
(0, vitest_1.describe)("LESSON_COMPLETED criterion", () => {
  (0, vitest_1.it)("awards badge when totalLessonsCompleted meets threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 5 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      totalLessonsCompleted: 5,
    });
    (0, vitest_1.expect)(result).toEqual(["b1"]);
  });
  (0, vitest_1.it)("does not award when below threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 5 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      totalLessonsCompleted: 4,
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
  (0, vitest_1.it)("awards when totalLessonsCompleted exceeds threshold", () => {
    const badge = makeBadge("b1", "LESSON_COMPLETED", { count: 3 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      totalLessonsCompleted: 10,
    });
    (0, vitest_1.expect)(result).toEqual(["b1"]);
  });
});
// ── XP_THRESHOLD ──────────────────────────────────────────────────────────────
(0, vitest_1.describe)("XP_THRESHOLD criterion", () => {
  (0, vitest_1.it)("awards badge when xpTotal meets threshold", () => {
    const badge = makeBadge("b2", "XP_THRESHOLD", { threshold: 500 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      xpTotal: 500,
    });
    (0, vitest_1.expect)(result).toEqual(["b2"]);
  });
  (0, vitest_1.it)("does not award when below threshold", () => {
    const badge = makeBadge("b2", "XP_THRESHOLD", { threshold: 500 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      xpTotal: 499,
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
});
// ── STREAK_DAYS ───────────────────────────────────────────────────────────────
(0, vitest_1.describe)("STREAK_DAYS criterion", () => {
  (0, vitest_1.it)("awards badge when streakDays meets threshold", () => {
    const badge = makeBadge("b3", "STREAK_DAYS", { days: 7 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      streakDays: 7,
    });
    (0, vitest_1.expect)(result).toEqual(["b3"]);
  });
  (0, vitest_1.it)("does not award when below threshold", () => {
    const badge = makeBadge("b3", "STREAK_DAYS", { days: 7 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      streakDays: 6,
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
});
// ── CATEGORY_MASTERY ──────────────────────────────────────────────────────────
(0, vitest_1.describe)("CATEGORY_MASTERY criterion", () => {
  (0, vitest_1.it)("awards badge when category count meets threshold", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "CYBERSEC", count: 10 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      categoryLessonCounts: { CYBERSEC: 10 },
    });
    (0, vitest_1.expect)(result).toEqual(["b4"]);
  });
  (0, vitest_1.it)("does not award when category count is below threshold", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "CYBERSEC", count: 10 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      categoryLessonCounts: { CYBERSEC: 9 },
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
  (0, vitest_1.it)("does not award when category is missing from counts", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "NETWORK", count: 5 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      categoryLessonCounts: {},
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
  (0, vitest_1.it)("does not award when count criterion is 0 (misconfigured badge)", () => {
    const badge = makeBadge("b4", "CATEGORY_MASTERY", { category: "DEV", count: 0 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      categoryLessonCounts: { DEV: 100 },
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
});
// ── PATH_COMPLETED ────────────────────────────────────────────────────────────
(0, vitest_1.describe)("PATH_COMPLETED criterion", () => {
  (0, vitest_1.it)("awards badge when completedPathId matches", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "path-abc" });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      completedPathId: "path-abc",
    });
    (0, vitest_1.expect)(result).toEqual(["b5"]);
  });
  (0, vitest_1.it)("awards badge with empty pathId (any path completes it)", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "" });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      completedPathId: "path-xyz",
    });
    (0, vitest_1.expect)(result).toEqual(["b5"]);
  });
  (0, vitest_1.it)("does not award when no path completed", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "path-abc" });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), BASE_CTX);
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
  (0, vitest_1.it)("does not award when completedPathId does not match required pathId", () => {
    const badge = makeBadge("b5", "PATH_COMPLETED", { pathId: "path-abc" });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      completedPathId: "path-other",
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
});
// ── PERFECT_QUIZ / CUSTOM ─────────────────────────────────────────────────────
(0, vitest_1.describe)("PERFECT_QUIZ and CUSTOM criteria", () => {
  (0, vitest_1.it)("never auto-awards PERFECT_QUIZ (manual award only)", () => {
    const badge = makeBadge("b6", "PERFECT_QUIZ", {});
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      xpTotal: 99999,
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
  (0, vitest_1.it)("never auto-awards CUSTOM (manual award only)", () => {
    const badge = makeBadge("b7", "CUSTOM", {});
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), {
      ...BASE_CTX,
      xpTotal: 99999,
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
});
// ── Already-earned / inactive guards ─────────────────────────────────────────
(0, vitest_1.describe)("already-earned and inactive guards", () => {
  (0, vitest_1.it)("does not re-award an already-earned badge", () => {
    const badge = makeBadge("b8", "XP_THRESHOLD", { threshold: 100 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(["b8"]), {
      ...BASE_CTX,
      xpTotal: 9999,
    });
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
  (0, vitest_1.it)("does not award an inactive badge", () => {
    const badge = makeBadge("b9", "XP_THRESHOLD", { threshold: 0 }, false);
    const result = (0, badge_evaluator_js_1.evaluateBadges)([badge], new Set(), BASE_CTX);
    (0, vitest_1.expect)(result).toHaveLength(0);
  });
  (0, vitest_1.it)("awards only badges not already earned from a mixed list", () => {
    const earned = makeBadge("earned", "XP_THRESHOLD", { threshold: 10 });
    const pending = makeBadge("pending", "XP_THRESHOLD", { threshold: 10 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)(
      [earned, pending],
      new Set(["earned"]),
      {
        ...BASE_CTX,
        xpTotal: 100,
      },
    );
    (0, vitest_1.expect)(result).toEqual(["pending"]);
  });
  (0, vitest_1.it)("returns multiple newly-earned badges at once", () => {
    const a = makeBadge("a", "XP_THRESHOLD", { threshold: 100 });
    const b = makeBadge("b", "LESSON_COMPLETED", { count: 1 });
    const c = makeBadge("c", "STREAK_DAYS", { days: 1 });
    const result = (0, badge_evaluator_js_1.evaluateBadges)([a, b, c], new Set(), {
      xpTotal: 200,
      streakDays: 3,
      totalLessonsCompleted: 5,
      categoryLessonCounts: {},
    });
    (0, vitest_1.expect)(result.sort()).toEqual(["a", "b", "c"]);
  });
});
//# sourceMappingURL=badge-evaluator.test.js.map
