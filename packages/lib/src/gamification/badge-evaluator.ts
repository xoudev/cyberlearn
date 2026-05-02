// Minimal structural type — callers pass Prisma Badge objects which satisfy this shape.
// Avoids a circular dep: @cyberlearn/lib must not import @cyberlearn/db.
export interface BadgeLike {
  id: string;
  isActive: boolean;
  criterionType: string;
  criterionData: unknown;
}

export interface BadgeEvaluationContext {
  xpTotal: number;
  streakDays: number;
  totalLessonsCompleted: number;
  /** Completed lessons count per category key (e.g. "DEV", "CYBERSEC", "NETWORK"). */
  categoryLessonCounts: Partial<Record<string, number>>;
  /** Set when the trigger is a path completion. */
  completedPathId?: string;
  /** Total certificates issued to this user. Required for withCertificate badges. */
  totalCertificates?: number;
  /** The lesson ID that just triggered this evaluation (real-time, first completion only). */
  completedLessonId?: string;
}

// ── Safe JSON accessors ────────────────────────────────────────────────────────

function num(data: unknown, key: string): number {
  if (typeof data !== "object" || data === null) return 0;
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "number" ? v : 0;
}

function str(data: unknown, key: string): string {
  if (typeof data !== "object" || data === null) return "";
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

// ── Criterion evaluator ────────────────────────────────────────────────────────

function isCriterionMet(badge: BadgeLike, ctx: BadgeEvaluationContext): boolean {
  const d = badge.criterionData;
  switch (badge.criterionType) {
    case "LESSON_COMPLETED":
      return ctx.totalLessonsCompleted >= num(d, "count");

    case "PATH_COMPLETED": {
      if ((d as Record<string, unknown>).withCertificate === true) {
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
export function evaluateBadges(
  allBadges: readonly BadgeLike[],
  alreadyEarned: ReadonlySet<string>,
  ctx: BadgeEvaluationContext,
): string[] {
  return allBadges
    .filter((b) => b.isActive && !alreadyEarned.has(b.id) && isCriterionMet(b, ctx))
    .map((b) => b.id);
}
