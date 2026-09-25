import { describe, expect, it } from "vitest";
import { calendarColumns, nextMilestone, streakCalendar, streakTodayKey } from "../streak";

describe("the streak panel in the app", () => {
  it("takes today in the site's timezone, not the phone's", () => {
    // 23:30 UTC on the 22nd is already the 23rd in Paris (UTC+2 in September).
    expect(streakTodayKey(new Date("2026-09-22T23:30:00Z"))).toBe("2026-09-23");
  });

  it("cuts the calendar into week columns of seven days", () => {
    const { cells } = streakCalendar({}, "2026-09-23");
    const columns = calendarColumns(cells);
    expect(columns).toHaveLength(53);
    expect(columns.every((column) => column.length === 7)).toBe(true);
    expect(columns.at(-1)?.[2]?.key).toBe("2026-09-23");
  });

  it("points at the next milestone, or none past the last", () => {
    expect(nextMilestone(0)).not.toBeNull();
    expect(nextMilestone(100000)).toBeNull();
  });
});
