import { describe, expect, it } from "vitest";
import { NOTIFICATION_SETTINGS } from "./notifications.js";

describe("NOTIFICATION_SETTINGS", () => {
  it("lists each stored switch once", () => {
    const keys = NOTIFICATION_SETTINGS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([
      "reviewReminders",
      "emailNotifications",
      "streakReminder",
      "weeklyDigest",
    ]);
  });

  it("marks the streak alert as not sent yet, and only it", () => {
    // Nothing sends a streak e-mail: a switch that looks live would be a promise.
    expect(NOTIFICATION_SETTINGS.filter((s) => !s.available).map((s) => s.key)).toEqual([
      "streakReminder",
    ]);
  });
});
