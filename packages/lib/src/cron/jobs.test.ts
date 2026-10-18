import { describe, expect, it } from "vitest";
import {
  CRON_GRACE_MS,
  CRON_JOBS,
  cronHealth,
  cronJob,
  longestGapMs,
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

describe("longestGapMs", () => {
  const HOUR = 3_600_000;

  it("is the step of an even schedule, and a day for a daily one", () => {
    const sixHourly = parseDailySchedule("0 */6 * * *");
    const daily = parseDailySchedule("30 3 * * *");
    expect(sixHourly === null ? null : longestGapMs(sixHourly)).toBe(6 * HOUR);
    expect(daily === null ? null : longestGapMs(daily)).toBe(24 * HOUR);
  });

  it("counts the wait across midnight on an uneven one", () => {
    const twice = parseDailySchedule("0 1,8 * * *");
    expect(twice === null ? null : longestGapMs(twice)).toBe(17 * HOUR);
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

  it("judges a job called from outside by the gap since its last run, whatever its caller's clock", () => {
    const sixHourly = parseDailySchedule("0 */6 * * *");
    // A caller on Paris time, in summer: 04:00 UTC rather than 00:00 or 06:00.
    const parisRun = { at: at("2026-10-17T04:00:10Z"), ok: true };
    expect(cronHealth(sixHourly, parisRun, at("2026-10-17T07:30:00Z"), "external")).toBe("ok");
    expect(cronHealth(sixHourly, parisRun, at("2026-10-17T10:59:00Z"), "external")).toBe("ok");
    // Six hours and the grace gone by without a run.
    expect(cronHealth(sixHourly, parisRun, at("2026-10-17T11:01:00Z"), "external")).toBe("late");
    // The same run judged on the UTC times would have been late at 07:30.
    expect(cronHealth(sixHourly, parisRun, at("2026-10-17T07:30:00Z"))).toBe("late");
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
