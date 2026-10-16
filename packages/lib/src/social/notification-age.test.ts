import { describe, expect, it } from "vitest";
import { notificationAge } from "./notification-age.js";

const NOW = Date.parse("2026-10-16T12:00:00.000Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(ms: number): Date {
  return new Date(NOW - ms);
}

describe("notificationAge", () => {
  it("picks the unit from the gap instead of counting everything in minutes", () => {
    expect(notificationAge(ago(20_000), NOW)).toBe("à l'instant");
    expect(notificationAge(ago(5 * MINUTE), NOW)).toBe("il y a 5 min");
    expect(notificationAge(ago(3 * HOUR), NOW)).toBe("il y a 3 h");
    expect(notificationAge(ago(DAY), NOW)).toBe("hier");
    expect(notificationAge(ago(4 * DAY), NOW)).toBe("il y a 4 j");
    // Last week: the panel used to say "il y a 10 080 minutes".
    expect(notificationAge(ago(7 * DAY), NOW)).toBe("il y a 1 sem.");
    expect(notificationAge(ago(20 * DAY), NOW)).toBe("il y a 3 sem.");
    expect(notificationAge(ago(95 * DAY), NOW)).toBe("il y a 3 mois");
    expect(notificationAge(ago(400 * DAY), NOW)).toBe("il y a 1 an");
    expect(notificationAge(ago(800 * DAY), NOW)).toBe("il y a 2 ans");
  });

  it("reads the string a Realtime row or the app's API carries", () => {
    expect(notificationAge(ago(2 * HOUR).toISOString(), NOW)).toBe("il y a 2 h");
  });

  it("reads a date slightly in the future as now", () => {
    expect(notificationAge(new Date(NOW + MINUTE), NOW)).toBe("à l'instant");
  });
});
