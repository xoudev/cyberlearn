import { describe, expect, it } from "vitest";
import type { CronJobRuns, CronRunView } from "@cyberlearn/db";
import { CRON_JOBS, type CronJob } from "@cyberlearn/lib/cron/jobs";
import { cronRows, cronTally, describeSchedule, formatDuration } from "../cron-status";

/**
 * The crons page as data: a schedule in words, where each job stands from
 * its last recorded run, and when the next one is expected.
 */

const NOW = new Date("2026-10-17T10:00:00Z");

function run(at: string, ok: boolean, error: string | null = null): CronRunView {
  return { at: new Date(at), ok, durationMs: 1200, summary: {}, error };
}

const RETENTION: CronJob = {
  name: "retention",
  path: "/api/cron/retention",
  schedule: "30 3 * * *",
  label: "Rétention",
  description: "",
  source: "vercel",
};

describe("describeSchedule", () => {
  it("says a daily time in UTC", () => {
    expect(describeSchedule("30 3 * * *")).toBe("Tous les jours à 03:30 UTC");
  });

  it("says an even step in hours with its times", () => {
    expect(describeSchedule("0 */6 * * *")).toBe("Toutes les 6 h (00:00, 06:00, 12:00, 18:00 UTC)");
  });

  it("lists uneven times, and shows a schedule it cannot read as written", () => {
    expect(describeSchedule("0 1,8 * * *")).toBe("Tous les jours à 01:00, 08:00 UTC");
    expect(describeSchedule("0 0 * * 1")).toBe("0 0 * * 1");
  });

  it("has words for every job the console lists", () => {
    for (const job of CRON_JOBS) expect(describeSchedule(job.schedule)).not.toBe(job.schedule);
  });
});

describe("cronRows", () => {
  it("is in order after today's run, and expects tomorrow's", () => {
    const runs = new Map<string, CronJobRuns>([
      ["retention", { lastRun: run("2026-10-17T03:30:05Z", true), lastFailure: null }],
    ]);
    const [row] = cronRows([RETENTION], runs, NOW);
    expect(row).toMatchObject({
      health: "ok",
      scheduleText: "Tous les jours à 03:30 UTC",
      nextRun: new Date("2026-10-18T03:30:00Z"),
      lastFailure: null,
    });
  });

  it("calls a job late when last night's run is missing past its grace", () => {
    const runs = new Map<string, CronJobRuns>([
      ["retention", { lastRun: run("2026-10-16T03:30:05Z", true), lastFailure: null }],
    ]);
    expect(cronRows([RETENTION], runs, NOW)[0]?.health).toBe("late");
  });

  it("reports a failed last run, and does not repeat it as the last error", () => {
    const failed = run("2026-10-17T03:30:05Z", false, "connection refused");
    const runs = new Map<string, CronJobRuns>([
      ["retention", { lastRun: failed, lastFailure: failed }],
    ]);
    const [row] = cronRows([RETENTION], runs, NOW);
    expect(row?.health).toBe("failed");
    expect(row?.lastFailure).toBeNull();
  });

  it("keeps an older failure under a run that worked since", () => {
    const older = run("2026-10-15T03:30:05Z", false, "timeout");
    const runs = new Map<string, CronJobRuns>([
      ["retention", { lastRun: run("2026-10-17T03:30:05Z", true), lastFailure: older }],
    ]);
    expect(cronRows([RETENTION], runs, NOW)[0]?.lastFailure).toBe(older);
  });

  it("says a job with no record was never seen", () => {
    const [row] = cronRows([RETENTION], new Map(), NOW);
    expect(row).toMatchObject({ health: "never", lastRun: null });
  });

  it("judges nothing on a schedule it cannot read, and expects no next run", () => {
    const weekly: CronJob = { ...RETENTION, schedule: "0 0 * * 1" };
    const runs = new Map<string, CronJobRuns>([
      ["retention", { lastRun: run("2026-10-01T00:00:00Z", true), lastFailure: null }],
    ]);
    expect(cronRows([weekly], runs, NOW)[0]).toMatchObject({ health: "unknown", nextRun: null });
  });
});

describe("cronTally", () => {
  it("counts the jobs in each state", () => {
    const rows = cronRows(
      CRON_JOBS,
      new Map([["retention", { lastRun: run("2026-10-17T03:30:05Z", true), lastFailure: null }]]),
      NOW,
    );
    expect(cronTally(rows)).toEqual({
      ok: 1,
      failed: 0,
      late: 0,
      never: CRON_JOBS.length - 1,
      unknown: 0,
    });
  });
});

describe("formatDuration", () => {
  it("reads in milliseconds, seconds, then minutes", () => {
    expect(formatDuration(812)).toBe("812 ms");
    expect(formatDuration(4200)).toBe("4,2 s");
    expect(formatDuration(65_000)).toBe("1 min 05 s");
  });
});
