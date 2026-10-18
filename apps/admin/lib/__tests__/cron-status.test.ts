import { describe, expect, it } from "vitest";
import type { CronJobRuns, CronRunView } from "@cyberlearn/db";
import { CRON_JOBS, type CronJob } from "@cyberlearn/lib/cron/jobs";
import { cronRows, cronTally, describeSchedule, formatDuration, summaryText } from "../cron-status";

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

  it("judges keep-alive by the gap since its last run, its caller's clock being its own", () => {
    const keepAlive = CRON_JOBS.find((job) => job.name === "keep-alive");
    if (keepAlive === undefined) throw new Error("keep-alive is not listed");
    // Called at 04:00 UTC by a caller on Paris time: six hours have not gone by.
    const runs = new Map<string, CronJobRuns>([
      ["keep-alive", { lastRun: run("2026-10-17T04:00:10Z", true), lastFailure: null }],
    ]);
    expect(cronRows([keepAlive], runs, NOW)[0]?.health).toBe("ok");
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

describe("summaryText", () => {
  it("says each job's report in the console's words", () => {
    expect(summaryText("streak-reset", { scanned: 12, frozen: 0, broken: 1, failed: 0 })).toBe(
      "séries examinées : 12 · gels consommés : 0 · séries cassées : 1 · écritures en échec : 0",
    );
    expect(summaryText("review-reminders", { sent: 1204, failed: 0, skipped: 3 })).toBe(
      "rappels envoyés : 1 204 · rappels non envoyés : 0 · déjà prévenus aujourd'hui : 3",
    );
    expect(summaryText("season-rollover", { seasonsFinalized: 1 })).toBe("saisons closes : 1");
    expect(
      summaryText("retention", {
        auditLogs: 4,
        resolvedTickets: 0,
        openTickets: 0,
        lessonPreviews: 2,
      }),
    ).toBe(
      "entrées d'audit purgées : 4 · tickets résolus purgés : 0 · tickets ouverts purgés : 0 · aperçus de leçon purgés : 2",
    );
    expect(
      summaryText("inactive-accounts", {
        erased: 1,
        erasureFailures: 0,
        warned: 2,
        noticeFailures: 0,
      }),
    ).toBe(
      "comptes effacés : 1 · effacements en échec : 0 · comptes prévenus : 2 · avis non envoyés : 0",
    );
  });

  it("says keep-alive's statuses in words", () => {
    expect(summaryText("keep-alive", { postgres: "ok", redis: "unknown" })).toBe(
      "Postgres : répond · Redis : non configuré",
    );
    expect(summaryText("keep-alive", { postgres: "error", redis: "ok" })).toBe(
      "Postgres : ne répond pas · Redis : répond",
    );
  });

  it("prints a key it has no words for as it is, rather than hiding it", () => {
    expect(summaryText("retention", { newCount: 3, done: true, none: null })).toBe(
      "newCount : 3 · done : oui · none : -",
    );
  });
});

describe("formatDuration", () => {
  it("reads in milliseconds, seconds, then minutes", () => {
    expect(formatDuration(812)).toBe("812 ms");
    expect(formatDuration(4200)).toBe("4,2 s");
    expect(formatDuration(65_000)).toBe("1 min 05 s");
  });
});
