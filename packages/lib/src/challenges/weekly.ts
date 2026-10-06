/**
 * The challenge of the week: one challenge for everybody, from Monday 00:00
 * UTC to the next, worth twice its XP to whoever solves it that week.
 *
 * Shared by the server, which credits the bonus (apps/web/lib/challenges/play.ts)
 * and names the challenge (apps/web/lib/challenges/catalogue.ts), and by the
 * site's page and the app, which count down to the end of the week.
 */

/** What this week's challenge is worth, against its usual reward. */
export const WEEKLY_XP_MULTIPLIER = 2;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
/** Monday 5 January 1970, 00:00 UTC: the first Monday after the epoch. */
const FIRST_MONDAY_MS = 4 * DAY_MS;

/** Whole weeks since the first Monday of 1970; a week starts Monday 00:00 UTC. */
export function weekIndex(now: Date): number {
  return Math.floor((now.getTime() - FIRST_MONDAY_MS) / WEEK_MS);
}

/** When the current week ends, and the next challenge takes over: Monday, 00:00 UTC. */
export function weekEnd(now: Date): Date {
  return new Date(FIRST_MONDAY_MS + (weekIndex(now) + 1) * WEEK_MS);
}

/**
 * This week's challenge among the active ones, given in catalogue order
 * (orderIndex, then creation): each takes its turn, a week at a time, and the
 * same one is picked for every learner.
 */
export function weeklyChallengeId(orderedIds: readonly string[], now: Date): string | null {
  const count = orderedIds.length;
  if (count === 0) return null;
  return orderedIds[((weekIndex(now) % count) + count) % count] ?? null;
}

/** The XP a solve is worth: the reward, twice over for the week's challenge. */
export function challengeXp(xpReward: number, isWeekly: boolean): number {
  return isWeekly ? xpReward * WEEKLY_XP_MULTIPLIER : xpReward;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * What is left, in its two largest units: "5 j 11 h", "3 h 07 min",
 * "12 min 04 s", "9 s". Nothing left reads "0 s".
 */
export function remainingLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${String(days)} j ${String(hours)} h`;
  if (hours > 0) return `${String(hours)} h ${pad(minutes)} min`;
  if (minutes > 0) return `${String(minutes)} min ${pad(seconds)} s`;
  return `${String(seconds)} s`;
}
