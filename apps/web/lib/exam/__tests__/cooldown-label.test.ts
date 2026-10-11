import { describe, expect, it } from "vitest";
import { unlockDateLabel, waitLeftLabel } from "../cooldown-label";

/** The wait after a failed exam, as the result screen words it. */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("waitLeftLabel", () => {
  it("counts in hours and minutes while hours are left", () => {
    expect(waitLeftLabel(48 * HOUR)).toBe("48 h 00 min");
    expect(waitLeftLabel(47 * HOUR + 5 * MINUTE)).toBe("47 h 05 min");
  });

  it("rounds up, so the last minutes never read as nothing", () => {
    expect(waitLeftLabel(HOUR + 1)).toBe("1 h 01 min");
    expect(waitLeftLabel(12 * MINUTE + 8.2 * SECOND)).toBe("12 min 09 s");
    expect(waitLeftLabel(400)).toBe("1 s");
  });

  it("counts in minutes and seconds within the last hour, then in seconds", () => {
    expect(waitLeftLabel(59 * MINUTE + 59 * SECOND)).toBe("59 min 59 s");
    expect(waitLeftLabel(45 * SECOND)).toBe("45 s");
  });

  it("never goes below zero", () => {
    expect(waitLeftLabel(-5 * SECOND)).toBe("0 s");
  });
});

describe("unlockDateLabel", () => {
  it("names the day and the time the next attempt opens", () => {
    const until = Date.UTC(2026, 9, 13, 12, 5);
    expect(unlockDateLabel(until, "Europe/Paris")).toBe("mardi 13 octobre à 14:05");
  });
});
