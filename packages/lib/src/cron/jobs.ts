/**
 * The site's scheduled jobs: where each one lives, when it is meant to run,
 * and what it is called in the console.
 *
 * Five are Vercel Crons, declared in apps/web/vercel.json; a test in apps/web
 * fails when this list and that file disagree, or when a route under
 * app/api/cron is missing from here. keep-alive is called from outside, by
 * cron-job.org every six hours (docs/infra/keep-alive.md), and is listed for
 * the console all the same: it is the one whose silence matters most.
 *
 * Each run is recorded in the audit log under "cron.<name>"
 * (apps/web/lib/cron-run.ts); the console's crons page compares the last one
 * with the schedule to say whether a job is late.
 */

export type CronSource = "vercel" | "external";

export interface CronJob {
  /** The route's folder under apps/web/app/api/cron, and the name its runs are recorded under. */
  name: string;
  path: string;
  /**
   * Five fields, in UTC, as vercel.json writes them. For a job called from
   * outside, the rhythm it is meant to keep: its caller's clock is its own,
   * so its lateness is judged by the gap since its last run (cronHealth).
   */
  schedule: string;
  /** What the console calls it. */
  label: string;
  /** What it does, in a sentence, for the console. */
  description: string;
  source: CronSource;
}

export const CRON_JOBS = [
  {
    name: "streak-reset",
    path: "/api/cron/streak-reset",
    schedule: "0 0 * * *",
    label: "Séries",
    description:
      "Consomme un gel ou casse la série de chaque apprenant resté inactif la veille, en jours de Paris.",
    source: "vercel",
  },
  {
    name: "season-rollover",
    path: "/api/cron/season-rollover",
    schedule: "0 1 * * *",
    label: "Saisons de ligue",
    description:
      "Clôt la saison échue, promeut et relègue chaque groupe, puis ouvre la saison suivante.",
    source: "vercel",
  },
  {
    name: "retention",
    path: "/api/cron/retention",
    schedule: "30 3 * * *",
    label: "Rétention",
    description:
      "Supprime ce que la politique de confidentialité ne garde plus : journal d'audit de plus de 12 mois, tickets, aperçus de leçon expirés.",
    source: "vercel",
  },
  {
    name: "inactive-accounts",
    path: "/api/cron/inactive-accounts",
    schedule: "0 4 * * *",
    label: "Comptes inactifs",
    description:
      "Efface les comptes inactifs depuis 24 mois prévenus il y a 30 jours, puis prévient les suivants.",
    source: "vercel",
  },
  {
    name: "review-reminders",
    path: "/api/cron/review-reminders",
    schedule: "0 8 * * *",
    label: "Rappels de révision",
    description: "Prévient chaque apprenant dont le rappel du jour a une question à poser.",
    source: "vercel",
  },
  {
    name: "keep-alive",
    path: "/api/cron/keep-alive",
    schedule: "0 */6 * * *",
    label: "Maintien en vie",
    description:
      "Interroge Postgres et Redis pour que les offres gratuites ne mettent pas la base en pause. Appelé par cron-job.org, hors de vercel.json.",
    source: "external",
  },
] as const satisfies readonly CronJob[];

export type CronJobName = (typeof CRON_JOBS)[number]["name"];

/** The job of a name, or undefined for a name this list does not hold. */
export function cronJob(name: string): CronJob | undefined {
  return CRON_JOBS.find((job) => job.name === name);
}

// ─── Schedules ──────────────────────────────────────────────────────────────

/** A schedule the console can reason about: the minutes and hours it fires at, every day. */
export interface DailySchedule {
  minutes: readonly number[];
  hours: readonly number[];
}

function field(value: string, max: number): number[] | null {
  if (value === "*") return Array.from({ length: max }, (_, i) => i);
  const step = /^\*\/(\d{1,2})$/u.exec(value);
  if (step !== null) {
    const n = Number(step[1]);
    if (n < 1 || n >= max) return null;
    return Array.from({ length: Math.ceil(max / n) }, (_, i) => i * n);
  }
  const values = value.split(",");
  const parsed = values.map((v) => (/^\d{1,2}$/u.test(v) ? Number(v) : Number.NaN));
  if (parsed.some((v) => Number.isNaN(v) || v >= max)) return null;
  return [...new Set(parsed)].sort((a, b) => a - b);
}

/**
 * The schedules the jobs use: a minute and an hour field (a number, a list,
 * "*" or "*\/n"), every day of every month. Anything else is null, and the
 * page says it cannot tell when the job runs next rather than guessing.
 */
export function parseDailySchedule(schedule: string): DailySchedule | null {
  const parts = schedule.trim().split(/\s+/u);
  if (parts.length !== 5) return null;
  const [minute = "", hour = "", day, month, weekday] = parts;
  if (day !== "*" || month !== "*" || weekday !== "*") return null;
  const minutes = field(minute, 60);
  const hours = field(hour, 24);
  return minutes === null || hours === null ? null : { minutes, hours };
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Every firing of the schedule on the UTC day of `day`, in order. */
function firingsOn(schedule: DailySchedule, day: number): number[] {
  const start = Math.floor(day / DAY) * DAY;
  return schedule.hours.flatMap((h) =>
    schedule.minutes.map((m) => start + h * 60 * MINUTE + m * MINUTE),
  );
}

/** The first firing strictly after `from`. */
export function nextRunAfter(schedule: DailySchedule, from: Date): Date {
  const t = from.getTime();
  for (let d = 0; d <= 1; d++) {
    const next = firingsOn(schedule, t + d * DAY).find((f) => f > t);
    if (next !== undefined) return new Date(next);
  }
  // Unreachable: every schedule parseDailySchedule accepts fires once a day at least.
  return new Date(t + DAY);
}

/** The longest wait between two firings of the schedule, the one across midnight included. */
export function longestGapMs(schedule: DailySchedule): number {
  const firings = firingsOn(schedule, 0);
  let longest = 0;
  firings.forEach((firing, i) => {
    const next = firings[i + 1] ?? (firings[0] ?? firing) + DAY;
    longest = Math.max(longest, next - firing);
  });
  return longest;
}

/** The last firing at or before `at`. */
export function previousRunAtOrBefore(schedule: DailySchedule, at: Date): Date {
  const t = at.getTime();
  for (let d = 0; d <= 1; d++) {
    const previous = firingsOn(schedule, t - d * DAY)
      .filter((f) => f <= t)
      .at(-1);
    if (previous !== undefined) return new Date(previous);
  }
  // Unreachable, as above.
  return new Date(t - DAY);
}

// ─── Health ─────────────────────────────────────────────────────────────────

/**
 * How long after its time a run may still arrive before the job counts as
 * late. Vercel starts a cron within its minute on a paid plan and within the
 * hour on the free one; cron-job.org within the minute.
 */
export const CRON_GRACE_MS = 60 * MINUTE;

export type CronHealth =
  /** The last run worked, and none was due since. */
  | "ok"
  /** The last run failed. */
  | "failed"
  /** A run was due, past its grace, and none was recorded. */
  | "late"
  /** No run recorded at all: a job new to the record, or one that never ran. */
  | "never"
  /** A schedule the page cannot read: the last run is shown, nothing judged. */
  | "unknown";

/**
 * Where a job stands, from its last recorded run. A failure is reported as
 * such even when the job is also late: the cause is the more useful of the two.
 *
 * A Vercel job is late when a firing of its schedule, in UTC, passed its
 * grace with no run since. A job called from outside is judged by the gap
 * since its last run instead: cron-job.org keeps a time zone per job, and a
 * caller on Paris time would fire two hours off the UTC times and be called
 * late for half of every day.
 */
export function cronHealth(
  schedule: DailySchedule | null,
  lastRun: { at: Date; ok: boolean } | null,
  now: Date,
  source: CronSource = "vercel",
): CronHealth {
  if (lastRun === null) return "never";
  if (!lastRun.ok) return "failed";
  if (schedule === null) return "unknown";
  if (source === "external") {
    const waited = now.getTime() - lastRun.at.getTime();
    return waited > longestGapMs(schedule) + CRON_GRACE_MS ? "late" : "ok";
  }
  const due = previousRunAtOrBefore(schedule, new Date(now.getTime() - CRON_GRACE_MS));
  return lastRun.at.getTime() < due.getTime() ? "late" : "ok";
}
