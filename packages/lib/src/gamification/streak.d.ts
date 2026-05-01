/**
 * Computes the new streak state after a daily activity.
 *
 * Rules:
 *  - Same calendar day as lastActiveAt → streak unchanged (already counted today)
 *  - Exactly one calendar day gap      → consecutive day, streak increments
 *  - Gap > 1 day                       → streak resets to 1
 */
export declare function computeNewStreak(
  currentStreak: number,
  lastActiveAt: Date,
  now?: Date,
): {
  streakDays: number;
  lastActiveAt: Date;
};
//# sourceMappingURL=streak.d.ts.map
