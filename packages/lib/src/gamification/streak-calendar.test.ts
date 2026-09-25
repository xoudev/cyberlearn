import { describe, expect, it } from "vitest";
import {
  STREAK_CALENDAR_WEEKS,
  STREAK_COPY,
  activityLevel,
  streakCalendar,
} from "./streak-calendar.js";

describe("the streak calendar", () => {
  it("draws a day by how much was done, capped at three", () => {
    expect([0, 1, 2, 3, 9].map(activityLevel)).toEqual([0, 1, 2, 3, 3]);
    expect(activityLevel(-1)).toBe(0);
  });

  it("lays 53 weeks out Monday first, ending on today's week", () => {
    // 2026-09-23 is a Wednesday.
    const { cells, monthLabels } = streakCalendar({}, "2026-09-23");
    expect(cells).toHaveLength(STREAK_CALENDAR_WEEKS * 7);
    expect(monthLabels).toHaveLength(STREAK_CALENDAR_WEEKS);
    const first = cells[0];
    expect(first && new Date(`${first.key}T00:00:00Z`).getUTCDay()).toBe(1);
    const today = cells.findIndex((c) => c.key === "2026-09-23");
    expect(today).toBe((STREAK_CALENDAR_WEEKS - 1) * 7 + 2);
    expect(cells.slice(today + 1).every((c) => c.future)).toBe(true);
    expect(cells.slice(0, today + 1).some((c) => c.future)).toBe(false);
  });

  it("reads each day's count from the server's activity", () => {
    const { cells } = streakCalendar({ "2026-09-21": 1, "2026-09-22": 4 }, "2026-09-23");
    expect(cells.find((c) => c.key === "2026-09-21")).toMatchObject({ count: 1, level: 1 });
    expect(cells.find((c) => c.key === "2026-09-22")).toMatchObject({ count: 4, level: 3 });
  });

  it("names a month once, on the first column it starts", () => {
    const { monthLabels } = streakCalendar({}, "2026-09-23");
    const named = monthLabels.filter((m) => m !== "");
    expect(named.length).toBeGreaterThanOrEqual(12);
    expect(named.length).toBeLessThanOrEqual(13);
    expect(named.at(-1)).toBe("sep");
  });

  it("words the values as the site does", () => {
    expect(STREAK_COPY.daysValue(12)).toBe("12 j");
    expect(STREAK_COPY.milestoneValue(null)).toBe("max");
    expect(STREAK_COPY.milestoneValue(30)).toBe("30 j");
    expect(STREAK_COPY.freezeCount(2)).toBe("2 dispo");
  });
});
