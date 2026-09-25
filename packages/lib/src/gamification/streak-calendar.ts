/**
 * The streak panel's calendar and words, the same on the site (dashboard and
 * profile) and in the app: a year of activity as 53 week-columns of seven
 * days, Monday first, ending on the current week, with the month each column
 * starts in. The counts are the server's (streakRepository.getOverview).
 */

export const STREAK_CALENDAR_WEEKS = 53;

const MS_DAY = 86_400_000;

const MONTH_ABBR = [
  "jan",
  "fév",
  "mar",
  "avr",
  "mai",
  "juin",
  "juil",
  "août",
  "sep",
  "oct",
  "nov",
  "déc",
];

/** The weekday gutter, Monday first; every other day left blank. */
export const WEEKDAY_LABELS = ["Lun", "", "Mer", "", "Ven", "", ""] as const;

export interface CalendarCell {
  /** "YYYY-MM-DD". */
  key: string;
  /** 0 nothing, 1 one activity, 2 two, 3 three or more. */
  level: number;
  count: number;
  /** Later this week than today: drawn empty. */
  future: boolean;
}

/** How dark a day is drawn: nothing, one, two, three or more. */
export function activityLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

/**
 * The calendar ending on the week of `todayKey` ("YYYY-MM-DD", the reader's
 * day in the streak timezone): cells in column order (week by week, Monday to
 * Sunday) and, per column, its month's abbreviation when the month changes.
 */
export function streakCalendar(
  activity: Readonly<Record<string, number>>,
  todayKey: string,
  weeks: number = STREAK_CALENDAR_WEEKS,
): { cells: CalendarCell[]; monthLabels: string[] } {
  const todayMs = Date.parse(`${todayKey}T00:00:00Z`);
  const todayDow = (new Date(todayMs).getUTCDay() + 6) % 7; // 0 = Monday
  const startMs = todayMs - ((weeks - 1) * 7 + todayDow) * MS_DAY;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const ms = startMs + i * MS_DAY;
    const key = new Date(ms).toISOString().slice(0, 10);
    const count = activity[key] ?? 0;
    cells.push({ key, level: activityLevel(count), count, future: ms > todayMs });
  }

  const monthLabels: string[] = [];
  let previous = -1;
  for (let w = 0; w < weeks; w++) {
    const month = new Date(startMs + w * 7 * MS_DAY).getUTCMonth();
    monthLabels.push(month === previous ? "" : (MONTH_ABBR[month] ?? ""));
    previous = month;
  }
  return { cells, monthLabels };
}

export const STREAK_COPY = {
  days: "jours",
  active: "Série active",
  broken: "Série rompue · relance-la",
  record: "Record",
  personalBest: "Record perso",
  thisYear: "Cette année",
  nextMilestone: "Prochain palier",
  lastYear: "12 derniers mois",
  less: "moins",
  more: "plus",
  freezeTitle: "Streak-freeze",
  freezeCount: (freezes: number): string => `${String(freezes)} dispo`,
  freezeNote:
    "Protège ta série d'un jour manqué. Se consomme automatiquement si tu sautes une journée.",
  daysValue: (days: number): string => `${String(days)} j`,
  milestoneValue: (next: number | null): string => (next === null ? "max" : `${String(next)} j`),
} as const;
