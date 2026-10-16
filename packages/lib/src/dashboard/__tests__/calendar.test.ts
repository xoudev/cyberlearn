import { describe, expect, it } from "vitest";
import { dashboardDateLabel, monthStartIn } from "../calendar";

describe("dashboardDateLabel", () => {
  it("names the day in Paris, capitalised", () => {
    expect(dashboardDateLabel(new Date("2026-10-16T10:00:00Z"))).toBe("Vendredi 16 octobre");
  });

  // 00:30 in Paris is still the day before in UTC, where the server runs.
  it("has already turned the page at half past midnight in Paris", () => {
    expect(dashboardDateLabel(new Date("2026-10-15T22:30:00Z"))).toBe("Vendredi 16 octobre");
    expect(dashboardDateLabel(new Date("2026-01-15T23:30:00Z"))).toBe("Vendredi 16 janvier");
  });
});

describe("monthStartIn", () => {
  it("starts the month at midnight on the first in Paris, summer time", () => {
    expect(monthStartIn(new Date("2026-10-16T10:00:00Z")).toISOString()).toBe(
      "2026-09-30T22:00:00.000Z",
    );
  });

  it("starts the month at midnight on the first in Paris, winter time", () => {
    expect(monthStartIn(new Date("2026-12-10T10:00:00Z")).toISOString()).toBe(
      "2026-11-30T23:00:00.000Z",
    );
  });

  // The clocks went back on 25 October: November starts at UTC+1.
  it("counts in the new month from midnight in Paris, while UTC is still in the old one", () => {
    expect(monthStartIn(new Date("2026-10-31T23:30:00Z")).toISOString()).toBe(
      "2026-10-31T23:00:00.000Z",
    );
  });

  it("stays in the old month until midnight in Paris", () => {
    expect(monthStartIn(new Date("2026-10-31T22:30:00Z")).toISOString()).toBe(
      "2026-09-30T22:00:00.000Z",
    );
  });

  it("reads another timezone when asked", () => {
    expect(monthStartIn(new Date("2026-10-16T10:00:00Z"), "UTC").toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });
});
