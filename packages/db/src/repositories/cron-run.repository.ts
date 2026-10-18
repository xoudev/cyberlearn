import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * Where the scheduled jobs leave a trace of each run: one row of the audit
 * log, written by nobody (actorId null, as retention.purge already is), under
 * the action "cron.<job>".
 *
 * No table of its own. The audit log already holds what a run needs (when,
 * which job, a JSON of what it did), is closed to every client by its RLS,
 * has an index on (action, createdAt) that answers "the last run of this job"
 * in one probe, and is emptied after twelve months by the retention job. A
 * dozen rows a day do not weigh on it.
 */

/** The audit log's targetType for a job's run. */
export const CRON_RUN_TARGET = "Cron";

/** The audit action a job's runs are written under: "cron.retention". */
export function cronRunAction(job: string): string {
  return `cron.${job}`;
}

/** What a job reports about a run: flat values, so the page can print them as they are. */
export type CronRunSummary = Record<string, string | number | boolean | null>;

export interface CronRunInput {
  ok: boolean;
  durationMs: number;
  summary: CronRunSummary;
  /** Why the run failed; null for one that did its work. */
  error: string | null;
}

/** A run as the console reads it back. */
export interface CronRunView {
  at: Date;
  ok: boolean;
  durationMs: number | null;
  summary: CronRunSummary;
  /** Null for a run that worked, and for a failure whose cause was not recorded. */
  error: string | null;
}

export interface CronJobRuns {
  lastRun: CronRunView | null;
  /** The latest run that failed, which may be older than the last run. */
  lastFailure: CronRunView | null;
}

function isSummaryValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * A run out of its audit row. The metadata is JSON anybody with the service
 * role could have written, so each field is checked; a row it cannot read is
 * a run that failed in a way nobody recorded, not a crash of the page.
 */
export function cronRunFrom(row: { createdAt: Date; metadata: Prisma.JsonValue }): CronRunView {
  const meta =
    row.metadata !== null && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const summary: CronRunSummary = {};
  const rawSummary = meta.summary;
  if (rawSummary !== null && typeof rawSummary === "object" && !Array.isArray(rawSummary)) {
    for (const [key, value] of Object.entries(rawSummary)) {
      if (isSummaryValue(value)) summary[key] = value;
    }
  }
  return {
    at: row.createdAt,
    ok: meta.ok === true,
    durationMs: typeof meta.durationMs === "number" ? meta.durationMs : null,
    summary,
    error: typeof meta.error === "string" ? meta.error : null,
  };
}

const RUN_ROW = { createdAt: true, metadata: true } as const satisfies Prisma.AuditLogSelect;

export const cronRunRepository = {
  /** Writes one run of a job. The caller decides what a failure to write costs. */
  async record(job: string, run: CronRunInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: cronRunAction(job),
        targetType: CRON_RUN_TARGET,
        targetId: job,
        metadata: {
          ok: run.ok,
          durationMs: run.durationMs,
          summary: run.summary,
          ...(run.error !== null ? { error: run.error } : {}),
        },
      },
    });
  },

  /** The last run and the last failure of each job, two probes of the action index per job. */
  async latest(jobs: readonly string[]): Promise<Map<string, CronJobRuns>> {
    const entries = await Promise.all(
      jobs.map(async (job): Promise<[string, CronJobRuns]> => {
        const action = cronRunAction(job);
        const [last, failure] = await Promise.all([
          prisma.auditLog.findFirst({
            where: { action, targetType: CRON_RUN_TARGET },
            orderBy: { createdAt: "desc" },
            select: RUN_ROW,
          }),
          prisma.auditLog.findFirst({
            where: {
              action,
              targetType: CRON_RUN_TARGET,
              metadata: { path: ["ok"], equals: false },
            },
            orderBy: { createdAt: "desc" },
            select: RUN_ROW,
          }),
        ]);
        return [
          job,
          {
            lastRun: last === null ? null : cronRunFrom(last),
            lastFailure: failure === null ? null : cronRunFrom(failure),
          },
        ];
      }),
    );
    return new Map(entries);
  },
};
