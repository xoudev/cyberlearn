/**
 * What a day asks for, and when a lesson is done with.
 *
 * SM-2 schedules every finished lesson for ever, and the queue, read raw,
 * grew with the lessons finished: sixty due at once after a fortnight away,
 * every one of them counted in the sidebar, and none of them ever done with.
 * Two rules, shared by the site and the app:
 *
 * - A day asks for REVIEW_SESSION_SIZE reviews at most, the ones overdue the
 *   longest first, the shakiest next. The others wait their turn, and are
 *   not what the sidebar counts.
 * - A lesson recalled often enough that its next review would be two months
 *   away is held: it leaves the cycle instead of coming back for ever.
 */

export const REVIEW_SESSION_SIZE = 5;

/** The next interval, in days, from which a lesson is held and leaves the cycle. */
export const REVIEW_MASTERY_INTERVAL_DAYS = 60;

export interface SessionCandidate {
  nextReviewAt: Date | string;
  /** SM-2's ease: the lower, the more often the lesson was found hard. */
  easeFactor: number;
}

function dueAt(value: Date | string): number {
  return typeof value === "string" ? Date.parse(value) : value.getTime();
}

/** Everything due, in the order a session takes it: overdue the longest first, the lowest ease next. */
export function prioritizeReviews<T extends SessionCandidate>(due: readonly T[]): T[] {
  return [...due].sort((a, b) => {
    const byDue = dueAt(a.nextReviewAt) - dueAt(b.nextReviewAt);
    return byDue !== 0 ? byDue : a.easeFactor - b.easeFactor;
  });
}

export interface ReviewSession<T> {
  /** What today asks for: REVIEW_SESSION_SIZE at most. */
  session: T[];
  /** Due as well, but for another day. */
  waiting: number;
}

/** The day's session out of everything due. */
export function reviewSession<T extends SessionCandidate>(
  due: readonly T[],
  size: number = REVIEW_SESSION_SIZE,
): ReviewSession<T> {
  const ordered = prioritizeReviews(due);
  return { session: ordered.slice(0, size), waiting: Math.max(0, ordered.length - size) };
}

/** What a day asks for out of `due` reviews: the count the sidebar shows. */
export function sessionSize(due: number, size: number = REVIEW_SESSION_SIZE): number {
  return Math.max(0, Math.min(due, size));
}

/** Whether, after this SM-2 step, the lesson is held well enough to leave the cycle. */
export function isMastered(next: { intervalDays: number; repetitions: number }): boolean {
  return next.repetitions >= 3 && next.intervalDays >= REVIEW_MASTERY_INTERVAL_DAYS;
}

/** The line under the session about the reviews that wait, or null when none do. */
export function waitingText(waiting: number): string | null {
  if (waiting <= 0) return null;
  if (waiting === 1) return "Une autre leçon attend son tour : elle revient demain.";
  return `${String(waiting)} autres leçons attendent leur tour, ${String(REVIEW_SESSION_SIZE)} par jour au plus.`;
}
