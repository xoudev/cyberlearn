import { describe, expect, it } from "vitest";
import {
  CRON_GRACE_MS,
  CRON_JOBS,
  cronHealth,
  cronJob,
  nextRunAfter,
  parseDailySchedule,
  previousRunAtOrBefore,
} from "./jobs";

/**
 * The jobs' schedules as the console reads them: when each runs next, when
 * it last should have, and whether the last recorded run says it is late.
 * The comparison with apps/web/vercel.json lives in apps/web, next to the file.
 */

const at = (iso: string): Date => new Date(iso);

describe("CRON_JOBS", () => {
  it("names each job once, after its route", () => {
    const names = CRON_JOBS.map((job) => job.name);
    expect(new Set(names).size).toBe(names.length);
    for (const job of CRON_JOBS) expect(job.path).toBe(`/api/cron/${job.name}`);
  });

  it("gives every job a schedule the console can read", () => {
    for (const job of CRON_JOBS) expect(parseDailySchedule(job.schedule)).not.toBeNull();
  });

  it("finds a job by its name", () => {
    expect(cronJob("retention")?.schedule).toBe("30 3 * * *");
    expect(cronJob("nope")).toBeUndefined();
  });
});

describe("parseDailySchedule", () => {
  it("reads a fixed time, a list and a step", () => {
    expect(parseDailySchedule("30 3 * * *")).toEqual({ minutes: [30], hours: [3] });
    expect(parseDailySchedule("0,30 8 * * *")).toEqual({ minutes: [0, 30], hours: [8] });
    expect(parseDailySchedule("0 */6 * * *")).toEqual({ minutes: [0], hours: [0, 6, 12, 18] });
  });

  it("refuses what it cannot reason about rather than guessing", () => {
    expect(parseDailySchedule("0 8 * * 1")).toBeNull();
    expect(parseDailySchedule("0 8 1 * *")).toBeNull();
    expect(parseDailySchedule("0 25 * * *")).toBeNull();
    expect(parseDailySchedule("0-10 8 * * *")).toBeNull();
    expect(parseDailySchedule("@daily")).toBeNull();
  });
});

describe("nextRunAfter and previousRunAtOrBefore", () => {
  const daily = parseDailySchedule("30 3 * * *");
  const sixHourly = parseDailySchedule("0 */6 * * *");
  if (daily === null || sixHourly === null) throw new Error("schedules expected to parse");

  it("finds the next firing later today, or tomorrow once it has passed", () => {
    expect(nextRunAfter(daily, at("2026-10-17T01:00:00Z"))).toEqual(at("2026-10-17T03:30:00Z"));
    expect(nextRunAfter(daily, at("2026-10-17T03:30:00Z"))).toEqual(at("2026-10-18T03:30:00Z"));
    expect(nextRunAfter(sixHourly, at("2026-10-17T19:00:00Z"))).toEqual(at("2026-10-18T00:00:00Z"));
  });

  it("finds the last firing, today's or yesterday's", () => {
    expect(previousRunAtOrBefore(daily, at("2026-10-17T03:30:00Z"))).toEqual(
      at("2026-10-17T03:30:00Z"),
    );
    expect(previousRunAtOrBefore(daily, at("2026-10-17T02:00:00Z"))).toEqual(
      at("2026-10-16T03:30:00Z"),
    );
    expect(previousRunAtOrBefore(sixHourly, at("2026-10-17T13:59:00Z"))).toEqual(
      at("2026-10-17T12:00:00Z"),
    );
  });
});

describe("cronHealth", () => {
  const daily = parseDailySchedule("30 3 * * *");

  it("is fine after today's run", () => {
    expect(
      cronHealth(daily, { at: at("2026-10-17T03:30:05Z"), ok: true }, at("2026-10-17T12:00:00Z")),
    ).toBe("ok");
  });

  it("gives a run its grace before calling the job late", () => {
    const yesterday = { at: at("2026-10-16T03:30:05Z"), ok: true };
    const withinGrace = new Date(at("2026-10-17T03:30:00Z").getTime() + CRON_GRACE_MS - 1);
    expect(cronHealth(daily, yesterday, withinGrace)).toBe("ok");
    expect(cronHealth(daily, yesterday, at("2026-10-17T05:00:00Z"))).toBe("late");
  });

  it("reports a failure before lateness, and says when it has no record", () => {
    expect(
      cronHealth(daily, { at: at("2026-10-10T03:30:05Z"), ok: false }, at("2026-10-17T12:00:00Z")),
    ).toBe("failed");
    expect(cronHealth(daily, null, at("2026-10-17T12:00:00Z"))).toBe("never");
    expect(
      cronHealth(null, { at: at("2026-10-10T03:30:05Z"), ok: true }, at("2026-10-17T12:00:00Z")),
    ).toBe("unknown");
  });
});
