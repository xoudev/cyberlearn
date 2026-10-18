import { cronRunRepository, type CronRunSummary } from "@cyberlearn/db";
import type { CronJobName } from "@cyberlearn/lib/cron/jobs";
import { errorMessage, logger } from "@cyberlearn/lib/logger";

/**
 * Records each run of a scheduled job, for the console's crons page: when it
 * ran, how long it took, what it did, and why it failed when it did.
 *
 * The routes used to leave a log line and nothing else, so nobody could tell
 * from the console whether last night's purge had run at all. Writing the run
 * never fails the job: a job that did its work and could not say so has still
 * done its work, and the page then shows it late, which is the truth it has.
 */

/** The top-level plain values of a job's result: what the page can print as they are. */
export function flatSummary(result: unknown): CronRunSummary {
  const summary: CronRunSummary = {};
  if (result === null || typeof result !== "object" || Array.isArray(result)) return summary;
  const entries: [string, unknown][] = Object.entries(result);
  for (const [key, value] of entries) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ) {
      summary[key] = value;
    }
  }
  return summary;
}

/** As much of a failure's message as the row keeps: enough to read, not a whole stack. */
export const CRON_ERROR_MAX = 500;

/** Writes one run; a failure to write is logged and swallowed. */
async function record(
  job: CronJobName,
  run: { ok: boolean; durationMs: number; summary: CronRunSummary; error: string | null },
): Promise<void> {
  try {
    await cronRunRepository.record(job, {
      ...run,
      error: run.error === null ? null : run.error.slice(0, CRON_ERROR_MAX),
    });
  } catch (err) {
    logger.error({ scope: "cron", job, err: errorMessage(err) }, "cron run not recorded");
  }
}

export interface TrackOptions<T> {
  /**
   * Why a run that returned did not do its job, or null when it did. For a
   * job that reports its own trouble rather than throwing (keep-alive).
   */
  failure?: (result: T) => string | null;
}

/**
 * Runs a job and records the run. What the job returns is handed back as it
 * is; what it throws is recorded as a failure and thrown again, so each route
 * keeps its own answer to an error (and Sentry still sees the unhandled ones).
 */
export async function trackCronRun<T>(
  job: CronJobName,
  run: () => Promise<T>,
  options: TrackOptions<T> = {},
): Promise<T> {
  const started = Date.now();
  let result: T;
  try {
    result = await run();
  } catch (err) {
    await record(job, {
      ok: false,
      durationMs: Date.now() - started,
      summary: {},
      error: errorMessage(err),
    });
    throw err;
  }
  const failure = options.failure?.(result) ?? null;
  await record(job, {
    ok: failure === null,
    durationMs: Date.now() - started,
    summary: flatSummary(result),
    error: failure,
  });
  return result;
}
