import type { UsageActivityDay, UsageLessonRow, UsageSignup } from "@cyberlearn/db";
import { dayKey, daysBetween } from "@cyberlearn/lib";

/**
 * The console's usage page, as figures: how many people are active, whether
 * the ones who sign up come back, and which lessons lose their readers.
 *
 * The dashboard counted what exists (accounts, lessons, certificates) and
 * nothing of what happens: nobody could say whether last month's sign-ups
 * were still there, nor which lesson of a path people stop at. The rows come
 * from usageRepository; everything here is counting, so it can be checked
 * without a database.
 *
 * Days are Paris's calendar days throughout, like the streak's.
 */

const DAY_MS = 86_400_000;

/** A calendar day key ("2026-11-14") moved by a number of days. */
export function shiftDay(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The key of an activity row's day: the column is a date, read back at UTC midnight. */
function activityKey(row: UsageActivityDay): string {
  return row.day.toISOString().slice(0, 10);
}

/** The Monday of the week a day falls in. */
export function mondayOf(key: string): string {
  // getUTCDay: 0 is Sunday. Monday-based: Monday 0 … Sunday 6.
  const weekday = (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
  return shiftDay(key, -weekday);
}

/** The first day the page reads activity from: thirty days, today included. */
export function activityWindowStart(now: Date): Date {
  return new Date(`${shiftDay(dayKey(now), -29)}T00:00:00Z`);
}

/** How many weeks of sign-ups the cohort table shows, the current one included. */
export const COHORT_WEEKS = 8;

/** The first instant of the oldest cohort week, close enough for a read that is grouped by day after. */
export function cohortWindowStart(now: Date): Date {
  const monday = shiftDay(mondayOf(dayKey(now)), -7 * (COHORT_WEEKS - 1));
  // A day earlier than Paris's midnight in UTC, so no sign-up of that Monday
  // is left out whatever the season; cohortsOf drops what falls before it.
  return new Date(Date.parse(`${monday}T00:00:00Z`) - DAY_MS);
}

export interface ActiveCounts {
  today: number;
  last7: number;
  last30: number;
  /** Active accounts on each of the last thirty days, oldest first. */
  daily: number[];
}

/** Distinct active accounts today, over seven days and over thirty, today included. */
export function activeCounts(rows: readonly UsageActivityDay[], now: Date): ActiveCounts {
  const today = dayKey(now);
  const byDay = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = activityKey(row);
    const users = byDay.get(key) ?? new Set<string>();
    users.add(row.userId);
    byDay.set(key, users);
  }
  const distinctOver = (days: number): number => {
    const users = new Set<string>();
    for (let i = 0; i < days; i++) {
      for (const user of byDay.get(shiftDay(today, -i)) ?? []) users.add(user);
    }
    return users.size;
  };
  const daily = Array.from(
    { length: 30 },
    (_el, i) => byDay.get(shiftDay(today, i - 29))?.size ?? 0,
  );
  return { today: distinctOver(1), last7: distinctOver(7), last30: distinctOver(30), daily };
}

export interface Cohort {
  /** The Monday the week starts on. */
  weekStart: string;
  signups: number;
  /** Finished the onboarding. */
  onboarded: number;
  /** Finished at least one lesson. */
  firstLesson: number;
  /** Signed up long enough ago for their second week to be over. */
  eligible: number;
  /** Of those, active on a day of their second week (days 7 to 13 after signing up). */
  returned: number;
}

/**
 * The sign-ups of the last COHORT_WEEKS weeks, by the week they signed up in,
 * with how far each week's accounts went.
 *
 * "Came back" is counted per account, on its own calendar: active between
 * its seventh and its thirteenth day. An account too recent for that window
 * to be over is not counted either way, so this week's cohort does not read
 * as one nobody came back from.
 */
export function cohortsOf(
  input: {
    signups: readonly UsageSignup[];
    activity: readonly UsageActivityDay[];
    firstLessons: readonly { userId: string; completedAt: Date | null }[];
  },
  now: Date,
): Cohort[] {
  const today = dayKey(now);
  const thisMonday = mondayOf(today);
  const weeks = Array.from({ length: COHORT_WEEKS }, (_el, i) =>
    shiftDay(thisMonday, -7 * (COHORT_WEEKS - 1 - i)),
  );
  const cohorts = new Map<string, Cohort>(
    weeks.map((weekStart) => [
      weekStart,
      { weekStart, signups: 0, onboarded: 0, firstLesson: 0, eligible: 0, returned: 0 },
    ]),
  );

  const activeDays = new Map<string, Set<string>>();
  for (const row of input.activity) {
    const days = activeDays.get(row.userId) ?? new Set<string>();
    days.add(activityKey(row));
    activeDays.set(row.userId, days);
  }
  const finishedOne = new Set(input.firstLessons.map((row) => row.userId));

  for (const signup of input.signups) {
    const signedUp = dayKey(signup.createdAt);
    const cohort = cohorts.get(mondayOf(signedUp));
    if (!cohort) continue;
    cohort.signups += 1;
    if (signup.username !== null) cohort.onboarded += 1;
    if (finishedOne.has(signup.id)) cohort.firstLesson += 1;
    if (daysBetween(signedUp, today) > 13) {
      cohort.eligible += 1;
      const days = activeDays.get(signup.id);
      const cameBack =
        days !== undefined &&
        [7, 8, 9, 10, 11, 12, 13].some((d) => days.has(shiftDay(signedUp, d)));
      if (cameBack) cohort.returned += 1;
    }
  }
  return weeks.map((weekStart) => cohorts.get(weekStart)).filter((c) => c !== undefined);
}

/** A lesson has to have been opened by this many people before its figures mean anything. */
export const STALLED_MIN_STARTED = 5;

export interface StalledLesson extends UsageLessonRow {
  /** The share of those who opened it and left it, from 0 to 1. */
  stalledShare: number;
}

/**
 * The lessons that lose the most of their readers: the largest share left in
 * progress and not opened since, among those enough people opened. The
 * largest share first, then the most opened, so one lesson two people left
 * out of five does not hide one two hundred left out of five hundred.
 */
export function stalledLessons(rows: readonly UsageLessonRow[], limit = 15): StalledLesson[] {
  return rows
    .filter((row) => row.started >= STALLED_MIN_STARTED && row.stalled > 0)
    .map((row) => ({ ...row, stalledShare: row.stalled / row.started }))
    .sort((a, b) => b.stalledShare - a.stalledShare || b.started - a.started)
    .slice(0, limit);
}

/** A share as a whole percentage, or an en dash when there is nothing to divide by. */
export function percent(part: number, whole: number): string {
  return whole === 0 ? "–" : `${String(Math.round((part / whole) * 100))} %`;
}
