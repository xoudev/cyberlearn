import { describe, expect, it } from "vitest";
import { wrappedWindow } from "../wrapped-window";

/**
 * The opening rule, checked at its boundaries rather than waited for.
 *
 * Midday UTC keeps each date inside the same Europe/Paris day; the boundary
 * cases that matter here are the first and last day of the window, and the two
 * days that sit just outside it.
 */
function at(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

describe("wrappedWindow", () => {
  it("is shut for most of the year, which is the point", () => {
    for (const day of ["2026-02-01", "2026-06-15", "2026-09-30", "2026-11-30"]) {
      expect(wrappedWindow(at(day)).open).toBe(false);
    }
  });

  it("opens on the first of December and stays open all month", () => {
    expect(wrappedWindow(at("2026-12-01")).open).toBe(true);
    expect(wrappedWindow(at("2026-12-25")).open).toBe(true);
    expect(wrappedWindow(at("2026-12-31")).open).toBe(true);
  });

  it("recaps the year it is opened in", () => {
    expect(wrappedWindow(at("2026-12-10")).periodKey).toBe("2026");
  });

  it("stays open for the first week of January, still showing the year that ended", () => {
    // A recap withdrawn at midnight on the 31st is unreadable for anyone who
    // spent the holidays away from a screen.
    expect(wrappedWindow(at("2027-01-01"))).toEqual({
      open: true,
      periodKey: "2026",
      opensOn: null,
    });
    expect(wrappedWindow(at("2027-01-07")).open).toBe(true);
    expect(wrappedWindow(at("2027-01-07")).periodKey).toBe("2026");
  });

  it("shuts again on the eighth of January", () => {
    const shut = wrappedWindow(at("2027-01-08"));
    expect(shut.open).toBe(false);
    // Still the year that ended, so a closed page can name what it will show.
    expect(shut.periodKey).toBe("2026");
    expect(shut.opensOn).toBe("2027-12-01");
  });

  it("says when it opens next, from anywhere in the closed stretch", () => {
    expect(wrappedWindow(at("2026-01-20")).opensOn).toBe("2026-12-01");
    expect(wrappedWindow(at("2026-07-04")).opensOn).toBe("2026-12-01");
    expect(wrappedWindow(at("2026-11-30")).opensOn).toBe("2026-12-01");
  });
});
