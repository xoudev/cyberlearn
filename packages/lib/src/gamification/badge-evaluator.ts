import { getMasteredCategories } from "../placement/scoring.js";
import { computeLevel } from "../xp.js";

// Minimal structural type - callers pass Prisma Badge objects which satisfy this shape.
// Avoids a circular dep: @cyberlearn/lib must not import @cyberlearn/db.
export interface BadgeLike {
  id: string;
  isActive: boolean;
  criterionType: string;
  criterionData: unknown;
}

/**
 * THE single source of truth for badge criteria.
 *
 * `computeBadgeProgress` answers both questions every consumer has:
 *  - real-time awarding (lesson completion, path completion):   done >= total
 *  - retroactive awarding + progress UI on /badges:             {done, total}
 *
 * It replaces the former pair of divergent implementations (`isCriterionMet`
 * here vs `computeProgress` in the /badges page) which disagreed on
 * PATH_COMPLETED keys, LESSON_SPECIFIC history, and misconfigured data.
 */

export interface BadgeProgress {
  /** Progress achieved, capped at `total`. */
  done: number;
  /** Target to reach. Always > 0 when progress is non-null. */
  total: number;
}

/**
 * Everything the criteria can be evaluated against. Pure data - callers build
 * it from `badgeRepository.findCriterionFacts` via `buildBadgeCriterionStats`,
 * applying any not-yet-persisted trigger delta themselves (e.g. the lesson
 * being completed right now).
 */
export interface BadgeCriterionStats {
  xpTotal: number;
  /** Level derived from xpTotal (drives LEVEL). */
  level: number;
  streakDays: number;
  totalLessonsCompleted: number;
  /** Completed lessons count per category key (e.g. "DEV", "CYBERSEC", "NETWORK"). */
  categoryLessonCounts: Partial<Record<string, number>>;
  /** IDs of every lesson the user has completed (drives LESSON_SPECIFIC). */
  completedLessonIds: ReadonlySet<string>;
  /** Number of paths the user has completed (drives PATH_COMPLETED count mode). */
  completedPathsCount: number;
  /** IDs of every path the user has completed (drives PATH_COMPLETED pathId mode). */
  completedPathIds: ReadonlySet<string>;
  /** Total certificates issued to the user (drives PATH_COMPLETED withCertificate). */
  totalCertificates: number;
  /** Quiz attempts scored exactly 100 (drives PERFECT_QUIZ). */
  perfectQuizCount: number;
  /** Categories mastered on the placement test - 0 when not taken (drives CUSTOM). */
  placementMasteredCount: number;
  /** refCodes of every badge the user has earned (drives BADGE_EARNED). */
  earnedBadgeRefCodes: ReadonlySet<string>;
}

/** Raw per-user facts, as returned by `badgeRepository.findCriterionFacts`. */
export interface BadgeCriterionFacts {
  completedLessons: { lessonId: string; category: string }[];
  completedPathIds: string[];
  totalCertificates: number;
  perfectQuizCount: number;
  /** refCodes of badges already earned (drives BADGE_EARNED unlocks). */
  earnedBadgeRefCodes: string[];
  placementScores: { devScore: number; cybersecScore: number; networkScore: number } | null;
}

/** Derive the full stats object from raw facts + the user's gamification numbers. */
export function buildBadgeCriterionStats(
  facts: BadgeCriterionFacts,
  user: { xpTotal: number; streakDays: number },
): BadgeCriterionStats {
  const categoryLessonCounts: Partial<Record<string, number>> = {};
  for (const lesson of facts.completedLessons) {
    categoryLessonCounts[lesson.category] = (categoryLessonCounts[lesson.category] ?? 0) + 1;
  }
  const placementMasteredCount = facts.placementScores
    ? Object.values(getMasteredCategories(facts.placementScores)).filter(Boolean).length
    : 0;
  return {
    xpTotal: user.xpTotal,
    level: computeLevel(user.xpTotal).level,
    streakDays: user.streakDays,
    totalLessonsCompleted: facts.completedLessons.length,
    categoryLessonCounts,
    completedLessonIds: new Set(facts.completedLessons.map((l) => l.lessonId)),
    completedPathsCount: facts.completedPathIds.length,
    completedPathIds: new Set(facts.completedPathIds),
    totalCertificates: facts.totalCertificates,
    perfectQuizCount: facts.perfectQuizCount,
    placementMasteredCount,
    earnedBadgeRefCodes: new Set(facts.earnedBadgeRefCodes),
  };
}

/**
 * The only CUSTOM criterion event currently wired: fired by the placement-test
 * submission when at least one category is mastered.
 */
export const PLACEMENT_TEST_PASSED_EVENT = "placement_test_passed";

// ── Safe JSON accessors ────────────────────────────────────────────────────────
// criterionData is untyped Json from Prisma; a missing or mistyped key reads as
// null so the criterion is treated as misconfigured (never awardable) instead
// of silently always-true.

function numOrNull(data: unknown, key: string): number | null {
  if (typeof data !== "object" || data === null) return null;
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function strOrNull(data: unknown, key: string): string | null {
  if (typeof data !== "object" || data === null) return null;
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function boolIsTrue(data: unknown, key: string): boolean {
  if (typeof data !== "object" || data === null) return false;
  return (data as Record<string, unknown>)[key] === true;
}

function strArrayOrNull(data: unknown, key: string): string[] | null {
  if (typeof data !== "object" || data === null) return null;
  const v = (data as Record<string, unknown>)[key];
  if (!Array.isArray(v)) return null;
  const strings = v.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : null;
}

// ── Unified criterion progress ─────────────────────────────────────────────────

/**
 * Compute a badge criterion's progress against the user's stats.
 *
 * Returns null when the criterion can never be satisfied automatically:
 * misconfigured criterionData (missing/invalid/<= 0 thresholds), or a CUSTOM
 * event that no hook fires.
 *
 * Canonical semantics per type:
 *  - LESSON_COMPLETED  {count}            - total completed lessons.
 *  - XP_THRESHOLD      {threshold}        - total XP.
 *  - STREAK_DAYS       {days}             - current streak.
 *  - CATEGORY_MASTERY  {category, count}  - completed lessons in ONE category;
 *                      {categories: []}   - at least one completed lesson in
 *                                           EACH listed category.
 *  - PATH_COMPLETED    {withCertificate: true} - at least one certificate;
 *                      {pathId}           - that SPECIFIC path completed;
 *                      {count} (default 1) - N paths completed (any).
 *  - LESSON_SPECIFIC   {lessonId}         - that lesson completed (history).
 *  - PERFECT_QUIZ      {count} (default 1) - N quiz attempts scored 100.
 *  - CUSTOM            {event}            - placement_test_passed: at least
 *                                           one placement category mastered.
 */
export function computeBadgeProgress(
  criterionType: string,
  criterionData: unknown,
  stats: BadgeCriterionStats,
): BadgeProgress | null {
  switch (criterionType) {
    case "LESSON_COMPLETED": {
      const count = numOrNull(criterionData, "count");
      if (count === null || count <= 0) return null;
      return { done: Math.min(stats.totalLessonsCompleted, count), total: count };
    }

    case "XP_THRESHOLD": {
      const threshold = numOrNull(criterionData, "threshold");
      if (threshold === null || threshold <= 0) return null;
      return { done: Math.min(stats.xpTotal, threshold), total: threshold };
    }

    case "STREAK_DAYS": {
      const days = numOrNull(criterionData, "days");
      if (days === null || days <= 0) return null;
      return { done: Math.min(stats.streakDays, days), total: days };
    }

    case "CATEGORY_MASTERY": {
      // Multi-category form: at least one completed lesson in EACH category.
      const categories = strArrayOrNull(criterionData, "categories");
      if (categories !== null) {
        const done = categories.filter((cat) => (stats.categoryLessonCounts[cat] ?? 0) >= 1).length;
        return { done, total: categories.length };
      }
      // Single-category form: N completed lessons in one category.
      const category = strOrNull(criterionData, "category");
      const count = numOrNull(criterionData, "count");
      if (!category || count === null || count <= 0) return null;
      return { done: Math.min(stats.categoryLessonCounts[category] ?? 0, count), total: count };
    }

    case "PATH_COMPLETED": {
      if (boolIsTrue(criterionData, "withCertificate")) {
        return { done: Math.min(stats.totalCertificates, 1), total: 1 };
      }
      const pathId = strOrNull(criterionData, "pathId");
      if (pathId !== null && pathId !== "") {
        return { done: stats.completedPathIds.has(pathId) ? 1 : 0, total: 1 };
      }
      // Count mode. Default 1 preserves the historical meaning of `{}` and
      // `{pathId: ""}`: "complete any one path".
      const count = numOrNull(criterionData, "count") ?? 1;
      if (count <= 0) return null;
      return { done: Math.min(stats.completedPathsCount, count), total: count };
    }

    case "LESSON_SPECIFIC": {
      const lessonId = strOrNull(criterionData, "lessonId");
      if (!lessonId) return null;
      return { done: stats.completedLessonIds.has(lessonId) ? 1 : 0, total: 1 };
    }

    case "PERFECT_QUIZ": {
      // Default 1 preserves the historical meaning of `{}`: "one perfect quiz".
      const count = numOrNull(criterionData, "count") ?? 1;
      if (count <= 0) return null;
      return { done: Math.min(stats.perfectQuizCount, count), total: count };
    }

    case "CUSTOM": {
      const event = strOrNull(criterionData, "event");
      if (event !== PLACEMENT_TEST_PASSED_EVENT) return null;
      return { done: stats.placementMasteredCount > 0 ? 1 : 0, total: 1 };
    }

    case "LEVEL": {
      const level = numOrNull(criterionData, "level");
      if (level === null || level <= 0) return null;
      return { done: Math.min(stats.level, level), total: level };
    }

    case "BADGE_EARNED": {
      const refCode = strOrNull(criterionData, "badgeRefCode");
      if (!refCode) return null;
      return { done: stats.earnedBadgeRefCodes.has(refCode) ? 1 : 0, total: 1 };
    }

    default:
      return null;
  }
}

/** True when the criterion is fully satisfied. */
export function isBadgeUnlocked(badge: BadgeLike, stats: BadgeCriterionStats): boolean {
  const progress = computeBadgeProgress(badge.criterionType, badge.criterionData, stats);
  return progress !== null && progress.total > 0 && progress.done >= progress.total;
}

/**
 * Returns the IDs of badges that should be newly awarded.
 * Pure function - no DB calls. Caller must supply active badges and already-earned set.
 */
export function evaluateBadges(
  allBadges: readonly BadgeLike[],
  alreadyEarned: ReadonlySet<string>,
  stats: BadgeCriterionStats,
): string[] {
  return allBadges
    .filter((b) => b.isActive && !alreadyEarned.has(b.id) && isBadgeUnlocked(b, stats))
    .map((b) => b.id);
}
