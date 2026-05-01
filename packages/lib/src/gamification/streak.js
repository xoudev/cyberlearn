"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNewStreak = computeNewStreak;
/**
 * Computes the new streak state after a daily activity.
 *
 * Rules:
 *  - Same calendar day as lastActiveAt → streak unchanged (already counted today)
 *  - Exactly one calendar day gap      → consecutive day, streak increments
 *  - Gap > 1 day                       → streak resets to 1
 */
function computeNewStreak(currentStreak, lastActiveAt, now = new Date()) {
  const todayStart = startOfDay(now);
  const lastActiveStart = startOfDay(lastActiveAt);
  const diffMs = todayStart.getTime() - lastActiveStart.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays === 0) return { streakDays: currentStreak, lastActiveAt };
  if (diffDays === 1) return { streakDays: currentStreak + 1, lastActiveAt: now };
  return { streakDays: 1, lastActiveAt: now };
}
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
//# sourceMappingURL=streak.js.map
