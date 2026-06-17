/**
 * Pure, server-authoritative daily-streak model (timezone: Europe/Paris).
 *
 * State is intentionally storage-agnostic: callers load the four fields, run a
 * pure transition here, and persist the result. Day boundaries come from
 * {@link dayKey} so the touch logic, the daily cron and the heatmap all agree.
 *
 * Rules
 *  - Activity on a new consecutive day increments the streak.
 *  - Missing exactly ONE day is bridged by a freeze if one is available (the
 *    streak survives and a freeze is consumed); otherwise the streak resets.
 *  - A gap of two or more days always breaks the streak.
 *  - One freeze is earned each time the streak crosses a 7-day boundary, capped
 *    at {@link MAX_FREEZES} in reserve.
 */
import { dayKey, daysBetween, previousDayKey, STREAK_TIMEZONE } from "./day.js";

/** Max freezes a user can keep in reserve. */
export const MAX_FREEZES = 2;
/** A freeze is granted every time the streak crosses a multiple of this. */
const FREEZE_EARN_EVERY = 7;
/** Streak lengths that unlock a "next milestone" target in the UI. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 180, 365] as const;

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  /** ISO "YYYY-MM-DD" of the last active (or frozen) day, or null if never active. */
  lastActiveDay: string | null;
  freezes: number;
}

export type ActivityEvent = "same-day" | "first" | "increment" | "bridged" | "reset";

export interface RegisterActivityResult {
  state: StreakState;
  event: ActivityEvent;
  freezeConsumed: boolean;
  freezeEarned: number;
}

function freezesEarnedBetween(prevStreak: number, nextStreak: number): number {
  if (nextStreak <= prevStreak) return 0;
  return Math.floor(nextStreak / FREEZE_EARN_EVERY) - Math.floor(prevStreak / FREEZE_EARN_EVERY);
}

/**
 * Registers a qualifying activity performed at `now`. Pure: returns the new
 * state and what happened (so the caller can notify / animate accordingly).
 */
export function registerActivity(
  state: StreakState,
  now: Date,
  tz: string = STREAK_TIMEZONE,
): RegisterActivityResult {
  const today = dayKey(now, tz);

  if (state.lastActiveDay === null) {
    const next: StreakState = {
      currentStreak: 1,
      longestStreak: Math.max(state.longestStreak, 1),
      lastActiveDay: today,
      freezes: Math.min(MAX_FREEZES, state.freezes),
    };
    return { state: next, event: "first", freezeConsumed: false, freezeEarned: 0 };
  }

  const gap = daysBetween(state.lastActiveDay, today);

  // Same day, or a clock running backwards: already counted, nothing changes.
  if (gap <= 0) {
    return { state, event: "same-day", freezeConsumed: false, freezeEarned: 0 };
  }

  let event: ActivityEvent;
  let freezeConsumed = false;
  let nextStreak: number;

  if (gap === 1) {
    nextStreak = state.currentStreak + 1;
    event = "increment";
  } else if (gap === 2 && state.freezes > 0) {
    // Missed exactly one day, covered by a freeze: continuity preserved.
    nextStreak = state.currentStreak + 1;
    freezeConsumed = true;
    event = "bridged";
  } else {
    nextStreak = 1;
    event = "reset";
  }

  const freezeEarned = freezesEarnedBetween(state.currentStreak, nextStreak);
  const freezes = Math.min(MAX_FREEZES, state.freezes - (freezeConsumed ? 1 : 0) + freezeEarned);

  const next: StreakState = {
    currentStreak: nextStreak,
    longestStreak: Math.max(state.longestStreak, nextStreak),
    lastActiveDay: today,
    freezes,
  };
  return { state: next, event, freezeConsumed, freezeEarned };
}

export type BoundaryEvent = "safe" | "frozen" | "broken";

export interface DayBoundaryResult {
  state: StreakState;
  event: BoundaryEvent;
}

/**
 * Applies the daily day-boundary check - run by the cron at the start of each
 * Europe/Paris day. If the user missed exactly yesterday and has a freeze, the
 * streak is preserved (a freeze is consumed and the last-active day advances to
 * yesterday). A gap of two or more days breaks the streak.
 */
export function applyDayBoundary(
  state: StreakState,
  now: Date,
  tz: string = STREAK_TIMEZONE,
): DayBoundaryResult {
  if (state.currentStreak === 0 || state.lastActiveDay === null) {
    return { state, event: "safe" };
  }

  const today = dayKey(now, tz);
  const gap = daysBetween(state.lastActiveDay, today);

  // Active today or yesterday: still alive.
  if (gap <= 1) return { state, event: "safe" };

  // Missed exactly yesterday: a freeze keeps the streak alive.
  if (gap === 2 && state.freezes > 0) {
    const next: StreakState = {
      ...state,
      freezes: state.freezes - 1,
      lastActiveDay: previousDayKey(today),
    };
    return { state: next, event: "frozen" };
  }

  // Missed two or more days (or no freeze): broken.
  return { state: { ...state, currentStreak: 0 }, event: "broken" };
}

/** The next streak milestone strictly greater than `streak`, or null past the top. */
export function nextMilestone(streak: number): number | null {
  for (const m of STREAK_MILESTONES) {
    if (m > streak) return m;
  }
  return null;
}
