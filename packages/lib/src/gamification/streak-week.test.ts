import { describe, expect, it } from "vitest";
import { streakWeek } from "./streak-week";

describe("streakWeek", () => {
  it("runs from Monday to Sunday around today", () => {
    // 2026-10-07 is a Wednesday.
    const week = streakWeek({}, "2026-10-07");
    expect(week.map((d) => d.key)).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    expect(week.map((d) => d.label).join("")).toBe("LMMJVSD");
  });

  it("marks today, and the days after it as still to come", () => {
    const week = streakWeek({}, "2026-10-07");
    expect(week.map((d) => d.today)).toEqual([false, false, true, false, false, false, false]);
    expect(week.map((d) => d.future)).toEqual([false, false, false, true, true, true, true]);
  });

  it("lights the days that had activity, and only those", () => {
    const week = streakWeek({ "2026-10-05": 2, "2026-10-07": 1, "2026-10-04": 3 }, "2026-10-07");
    expect(week.map((d) => d.active)).toEqual([true, false, true, false, false, false, false]);
  });

  it("has no future on a Sunday, and a whole week ahead on a Monday", () => {
    expect(streakWeek({}, "2026-10-11").every((d) => !d.future)).toBe(true);
    const monday = streakWeek({}, "2026-10-05");
    expect(monday[0]?.today).toBe(true);
    expect(monday.slice(1).every((d) => d.future)).toBe(true);
  });

  it("crosses a month boundary without losing a day", () => {
    // 2026-10-01 is a Thursday: the week started in September.
    expect(streakWeek({}, "2026-10-01")[0]?.key).toBe("2026-09-28");
  });
});
