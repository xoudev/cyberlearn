"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateBadges = evaluateBadges;
// ── Safe JSON accessors ────────────────────────────────────────────────────────
function num(data, key) {
  if (typeof data !== "object" || data === null) return 0;
  const v = data[key];
  return typeof v === "number" ? v : 0;
}
function str(data, key) {
  if (typeof data !== "object" || data === null) return "";
  const v = data[key];
  return typeof v === "string" ? v : "";
}
// ── Criterion evaluator ────────────────────────────────────────────────────────
function isCriterionMet(badge, ctx) {
  const d = badge.criterionData;
  switch (badge.criterionType) {
    case "LESSON_COMPLETED":
      return ctx.totalLessonsCompleted >= num(d, "count");
    case "PATH_COMPLETED": {
      if (d.withCertificate === true) {
        return (ctx.totalCertificates ?? 0) >= 1;
      }
      if (!ctx.completedPathId) return false;
      const required = str(d, "pathId");
      return required === "" || required === ctx.completedPathId;
    }
    case "XP_THRESHOLD":
      return ctx.xpTotal >= num(d, "threshold");
    case "STREAK_DAYS":
      return ctx.streakDays >= num(d, "days");
    case "CATEGORY_MASTERY": {
      const cat = str(d, "category");
      const count = num(d, "count");
      return count > 0 && (ctx.categoryLessonCounts[cat] ?? 0) >= count;
    }
    case "LESSON_SPECIFIC": {
      if (!ctx.completedLessonId) return false;
      const required = str(d, "lessonId");
      return required !== "" && required === ctx.completedLessonId;
    }
    case "PERFECT_QUIZ":
    case "CUSTOM":
      return false; // Manual award only via admin
    default:
      return false;
  }
}
/**
 * Returns the IDs of badges that should be newly awarded.
 * Pure function — no DB calls. Caller must supply active badges and already-earned set.
 */
function evaluateBadges(allBadges, alreadyEarned, ctx) {
  return allBadges
    .filter((b) => b.isActive && !alreadyEarned.has(b.id) && isCriterionMet(b, ctx))
    .map((b) => b.id);
}
//# sourceMappingURL=badge-evaluator.js.map
