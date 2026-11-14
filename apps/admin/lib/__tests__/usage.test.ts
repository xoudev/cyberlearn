import { describe, expect, it } from "vitest";
import {
  activeCounts,
  activityWindowStart,
  cohortsOf,
  cohortWindowStart,
  mondayOf,
  percent,
  shiftDay,
  stalledLessons,
} from "../usage";

// Saturday 14 November 2026, 11:00 in Paris.
const NOW = new Date("2026-11-14T10:00:00Z");

function day(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

describe("calendar helpers", () => {
  it("moves a day key across a month", () => {
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDay("2026-11-14", 7)).toBe("2026-11-21");
  });

  it("finds the Monday of a week, from any of its days", () => {
    expect(mondayOf("2026-11-14")).toBe("2026-11-09");
    expect(mondayOf("2026-11-09")).toBe("2026-11-09");
    // A Sunday belongs to the week that ends on it.
    expect(mondayOf("2026-11-15")).toBe("2026-11-09");
  });

  it("reads thirty days of activity, today included", () => {
    expect(activityWindowStart(NOW).toISOString()).toBe("2026-10-16T00:00:00.000Z");
  });

  it("starts the cohorts a day before their first Monday, so none of its sign-ups is missed", () => {
    // Eight weeks, this one included: the first Monday is 21 September.
    expect(cohortWindowStart(NOW).toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });
});

describe("activeCounts", () => {
  const rows = [
    { userId: "a", day: day("2026-11-14") },
    { userId: "b", day: day("2026-11-14") },
    // The same account on two days is one account over the week.
    { userId: "a", day: day("2026-11-10") },
    { userId: "c", day: day("2026-11-08") },
    // Eight days ago: out of the week, in the month.
    { userId: "d", day: day("2026-11-06") },
    // Thirty days ago exactly: out of the thirty days, which include today.
    { userId: "e", day: day("2026-10-15") },
  ];

  it("counts distinct accounts today, over seven days and over thirty", () => {
    const counts = activeCounts(rows, NOW);
    expect(counts.today).toBe(2);
    expect(counts.last7).toBe(3);
    expect(counts.last30).toBe(4);
  });

  it("draws one figure per day, oldest first, ending today", () => {
    const { daily } = activeCounts(rows, NOW);
    expect(daily).toHaveLength(30);
    expect(daily[29]).toBe(2);
    expect(daily[25]).toBe(1);
    expect(daily[0]).toBe(0);
  });

  it("is all zeroes with nobody active", () => {
    expect(activeCounts([], NOW)).toMatchObject({ today: 0, last7: 0, last30: 0 });
  });
});

describe("cohortsOf", () => {
  const signups = [
    // Week of 26 October: old enough for its second week to be over.
    { id: "old-back", createdAt: new Date("2026-10-27T09:00:00Z"), username: "a" },
    { id: "old-gone", createdAt: new Date("2026-10-28T09:00:00Z"), username: "b" },
    { id: "old-never-onboarded", createdAt: new Date("2026-10-29T09:00:00Z"), username: null },
    // This week: too recent to say whether they come back.
    { id: "new", createdAt: new Date("2026-11-12T09:00:00Z"), username: "d" },
    // Before the eight weeks: not in any cohort shown.
    { id: "ancient", createdAt: new Date("2026-08-01T09:00:00Z"), username: "e" },
  ];
  const activity = [
    // Day 8 after signing up: came back.
    { userId: "old-back", day: day("2026-11-04") },
    // Day 2 only: active once, never in the second week.
    { userId: "old-gone", day: day("2026-10-30") },
    { userId: "new", day: day("2026-11-13") },
  ];
  const firstLessons = [
    { userId: "old-back", completedAt: new Date("2026-10-27T10:00:00Z") },
    { userId: "new", completedAt: new Date("2026-11-13T10:00:00Z") },
  ];

  const cohorts = cohortsOf({ signups, activity, firstLessons }, NOW);

  it("shows eight weeks, oldest first, the current one last", () => {
    expect(cohorts).toHaveLength(8);
    expect(cohorts[0]?.weekStart).toBe("2026-09-21");
    expect(cohorts[7]?.weekStart).toBe("2026-11-09");
  });

  it("counts how far a week's sign-ups went", () => {
    expect(cohorts.find((c) => c.weekStart === "2026-10-26")).toEqual({
      weekStart: "2026-10-26",
      signups: 3,
      onboarded: 2,
      firstLesson: 1,
      eligible: 3,
      returned: 1,
    });
  });

  it("does not count this week's sign-ups as people who did not come back", () => {
    expect(cohorts[7]).toMatchObject({ signups: 1, firstLesson: 1, eligible: 0, returned: 0 });
  });

  it("leaves a sign-up from before the window out", () => {
    expect(cohorts.reduce((n, c) => n + c.signups, 0)).toBe(4);
  });

  it("files a sign-up late on a Sunday evening under Paris's week, not UTC's", () => {
    // 23:30 UTC on Sunday 8 November is 00:30 on Monday 9 in Paris.
    const late = cohortsOf(
      {
        signups: [{ id: "x", createdAt: new Date("2026-11-08T23:30:00Z"), username: null }],
        activity: [],
        firstLessons: [],
      },
      NOW,
    );
    expect(late[7]?.signups).toBe(1);
  });
});

describe("stalledLessons", () => {
  const lesson = (id: string, started: number, completed: number, stalled: number) => ({
    id,
    refCode: `CL-LSN-${id}`,
    title: `Leçon ${id}`,
    started,
    completed,
    stalled,
  });

  it("puts the largest share of readers lost first, then the most opened", () => {
    const rows = stalledLessons([
      lesson("a", 100, 80, 10),
      lesson("b", 10, 4, 5),
      lesson("c", 200, 90, 100),
      lesson("d", 20, 8, 10),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["c", "d", "b", "a"]);
    expect(rows[0]?.stalledShare).toBe(0.5);
  });

  it("leaves out a lesson too few people opened, and one nobody left", () => {
    expect(stalledLessons([lesson("few", 4, 0, 4), lesson("fine", 50, 50, 0)])).toEqual([]);
  });

  it("keeps to the number asked for", () => {
    const rows = Array.from({ length: 30 }, (_el, i) => lesson(String(i), 10, 0, 5));
    expect(stalledLessons(rows, 15)).toHaveLength(15);
  });
});

describe("percent", () => {
  it("rounds to a whole percentage, and says nothing of a division by zero", () => {
    expect(percent(1, 3)).toBe("33 %");
    expect(percent(0, 5)).toBe("0 %");
    expect(percent(0, 0)).toBe("–");
  });
});
