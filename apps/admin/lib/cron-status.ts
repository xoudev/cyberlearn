import type { CronJobRuns, CronRunSummary, CronRunView } from "@cyberlearn/db";
import {
  cronHealth,
  nextRunAfter,
  parseDailySchedule,
  type CronHealth,
  type CronJob,
  type DailySchedule,
} from "@cyberlearn/lib/cron/jobs";

/**
 * The console's crons page, as data: each job with its schedule in words,
 * its last run, the next one expected, and where it stands. Pure, so the
 * page renders it and a test checks it.
 */

function hhmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * A schedule in words, in UTC as Vercel reads it: "Tous les jours à 03:30
 * UTC", "Toutes les 6 h (00:00, 06:00, 12:00, 18:00 UTC)". One the page
 * cannot read is shown as it is written.
 */
export function describeSchedule(schedule: string): string {
  const parsed = parseDailySchedule(schedule);
  if (parsed === null) return schedule;
  const times = parsed.hours.flatMap((h) => parsed.minutes.map((m) => hhmm(h, m)));
  if (times.length === 1) return `Tous les jours à ${times[0] ?? ""} UTC`;
  const [first, second] = parsed.hours;
  const evenStep =
    parsed.minutes.length === 1 &&
    first !== undefined &&
    second !== undefined &&
    parsed.hours.every((h, i) => h === first + i * (second - first)) &&
    24 % (second - first) === 0 &&
    parsed.hours.length === 24 / (second - first);
  return evenStep
    ? `Toutes les ${String(second - first)} h (${times.join(", ")} UTC)`
    : `Tous les jours à ${times.join(", ")} UTC`;
}

export interface CronRow {
  job: CronJob;
  scheduleText: string;
  health: CronHealth;
  lastRun: CronRunView | null;
  /** Shown only when it is not the last run itself. */
  lastFailure: CronRunView | null;
  /** Null for a schedule the page cannot read. */
  nextRun: Date | null;
}

export function cronRows(
  jobs: readonly CronJob[],
  runs: ReadonlyMap<string, CronJobRuns>,
  now: Date,
): CronRow[] {
  return jobs.map((job) => {
    const schedule: DailySchedule | null = parseDailySchedule(job.schedule);
    const recorded = runs.get(job.name) ?? { lastRun: null, lastFailure: null };
    const lastFailure =
      recorded.lastFailure !== null &&
      recorded.lastRun !== null &&
      recorded.lastFailure.at.getTime() === recorded.lastRun.at.getTime()
        ? null
        : recorded.lastFailure;
    return {
      job,
      scheduleText: describeSchedule(job.schedule),
      health: cronHealth(schedule, recorded.lastRun, now, job.source),
      lastRun: recorded.lastRun,
      lastFailure,
      nextRun: schedule === null ? null : nextRunAfter(schedule, now),
    };
  });
}

/** How many jobs stand in each state, for the figures above the table. */
export function cronTally(rows: readonly CronRow[]): Record<CronHealth, number> {
  const tally: Record<CronHealth, number> = { ok: 0, failed: 0, late: 0, never: 0, unknown: 0 };
  for (const row of rows) tally[row.health] += 1;
  return tally;
}

/**
 * What each job's report holds, in the console's words: the keys its route
 * returns (apps/web/app/api/cron/<job>), and for keep-alive the words of the
 * statuses it reports.
 */
const SUMMARY_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "streak-reset": {
    scanned: "séries examinées",
    frozen: "gels consommés",
    broken: "séries cassées",
    failed: "écritures en échec",
  },
  "season-rollover": { seasonsFinalized: "saisons closes" },
  retention: {
    auditLogs: "entrées d'audit purgées",
    resolvedTickets: "tickets résolus purgés",
    openTickets: "tickets ouverts purgés",
    lessonPreviews: "aperçus de leçon purgés",
  },
  "inactive-accounts": {
    erased: "comptes effacés",
    erasureFailures: "effacements en échec",
    warned: "comptes prévenus",
    noticeFailures: "avis non envoyés",
  },
  "review-reminders": {
    sent: "rappels envoyés",
    failed: "rappels non envoyés",
    skipped: "déjà prévenus aujourd'hui",
  },
  "keep-alive": { postgres: "Postgres", redis: "Redis" },
};

const SUMMARY_VALUES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "keep-alive": { ok: "répond", error: "ne répond pas", unknown: "non configuré" },
};

function summaryValue(job: string, value: string | number | boolean | null): string {
  if (value === null) return "-";
  if (typeof value === "boolean") return value ? "oui" : "non";
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  return SUMMARY_VALUES[job]?.[value] ?? value;
}

/**
 * What a run reported, as "séries examinées : 12 · séries cassées : 1". A key
 * this table does not know yet is printed as it is rather than hidden: the
 * page says what the run recorded, even before it has the words for it.
 */
export function summaryText(job: string, summary: CronRunSummary): string {
  const labels = SUMMARY_LABELS[job] ?? {};
  return Object.entries(summary)
    .map(([key, value]) => `${labels[key] ?? key} : ${summaryValue(job, value)}`)
    .join(" · ");
}

/** "812 ms", "4,2 s", "1 min 05 s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))} ms`;
  if (ms < 60_000) return `${(ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${String(minutes)} min ${String(seconds).padStart(2, "0")} s`;
}
