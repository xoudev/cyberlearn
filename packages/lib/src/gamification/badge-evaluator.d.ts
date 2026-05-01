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
}
/**
 * Returns the IDs of badges that should be newly awarded.
 * Pure function — no DB calls. Caller must supply active badges and already-earned set.
 */
export declare function evaluateBadges(
  allBadges: readonly BadgeLike[],
  alreadyEarned: ReadonlySet<string>,
  ctx: BadgeEvaluationContext,
): string[];
//# sourceMappingURL=badge-evaluator.d.ts.map
