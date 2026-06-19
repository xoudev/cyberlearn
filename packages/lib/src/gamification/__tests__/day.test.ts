import { describe, expect, it } from "vitest";
import { dayKey, daysBetween, previousDayKey } from "../day.js";

// dayKey resolves the calendar day in Europe/Paris regardless of the host tz.
describe("dayKey (Europe/Paris)", () => {
  it("uses Paris winter offset (UTC+1) at the day boundary", () => {
    // 23:30 UTC on Jan 15 is 00:30 Paris on Jan 16 (CET).
    expect(dayKey(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
    expect(dayKey(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });

  it("uses Paris summer offset (UTC+2) at the day boundary", () => {
    // 22:30 UTC on Jul 15 is 00:30 Paris on Jul 16 (CEST).
    expect(dayKey(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
    expect(dayKey(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-15");
  });

  it("formats as ISO YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-04-28T08:00:00Z"))).toBe("2026-04-28");
  });
});

describe("daysBetween", () => {
  it("counts consecutive days as 1", () => {
    expect(daysBetween("2026-04-27", "2026-04-28")).toBe(1);
  });
  it("crosses month boundaries", () => {
    expect(daysBetween("2026-04-30", "2026-05-01")).toBe(1);
  });
  it("is 0 for the same day and negative when reversed", () => {
    expect(daysBetween("2026-04-28", "2026-04-28")).toBe(0);
    expect(daysBetween("2026-04-28", "2026-04-26")).toBe(-2);
  });
  it("is unaffected by the spring-forward DST day", () => {
    // 2026 DST starts Sun Mar 29 in Paris - the calendar gap is still 1.
    expect(daysBetween("2026-03-28", "2026-03-29")).toBe(1);
    expect(daysBetween("2026-03-29", "2026-03-30")).toBe(1);
  });
});

describe("previousDayKey", () => {
  it("returns the day before", () => {
    expect(previousDayKey("2026-05-01")).toBe("2026-04-30");
    expect(previousDayKey("2026-01-01")).toBe("2025-12-31");
  });
});
