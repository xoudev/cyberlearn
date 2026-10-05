/**
 * The current week of the streak, Monday to Sunday: which days had activity,
 * which one is today, which ones have not come yet. The dashboard draws this
 * row; the full year stays on the profile (streak-calendar).
 */

const MS_DAY = 86_400_000;

/** One letter a day, Monday first, as the row prints them. */
export const WEEK_DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;

export interface WeekDay {
  /** "YYYY-MM-DD". */
  key: string;
  label: string;
  active: boolean;
  today: boolean;
  /** Later this week than today: drawn empty. */
  future: boolean;
}

/**
 * `todayKey` is the reader's day in the streak timezone ("YYYY-MM-DD");
 * `activity` the per-day counts the server keeps.
 */
export function streakWeek(
  activity: Readonly<Record<string, number>>,
  todayKey: string,
): WeekDay[] {
  const todayMs = Date.parse(`${todayKey}T00:00:00Z`);
  const todayDow = (new Date(todayMs).getUTCDay() + 6) % 7; // 0 = Monday
  const mondayMs = todayMs - todayDow * MS_DAY;

  return WEEK_DAY_LETTERS.map((label, offset) => {
    const key = new Date(mondayMs + offset * MS_DAY).toISOString().slice(0, 10);
    return {
      key,
      label,
      active: (activity[key] ?? 0) > 0,
      today: offset === todayDow,
      future: offset > todayDow,
    };
  });
}
