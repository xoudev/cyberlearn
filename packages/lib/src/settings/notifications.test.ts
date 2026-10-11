import { describe, expect, it } from "vitest";
import { NOTIFICATION_SETTINGS, SHOWN_NOTIFICATION_SETTINGS } from "./notifications.js";

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

  it("marks the streak alert and the product news as not sent yet", () => {
    // Nothing sends a streak alert, and nothing reads weeklyDigest: a switch
    // that looks live would be a promise.
    expect(NOTIFICATION_SETTINGS.filter((s) => !s.available).map((s) => s.key)).toEqual([
      "streakReminder",
      "weeklyDigest",
    ]);
  });

  it("shows only the switches something sends", () => {
    expect(SHOWN_NOTIFICATION_SETTINGS.map((s) => s.key)).toEqual([
      "reviewReminders",
      "emailNotifications",
    ]);
  });

  it("does not promise an email for the review reminders, which stay in the bell", () => {
    const reminders = NOTIFICATION_SETTINGS.find((s) => s.key === "reviewReminders");
    expect(reminders?.desc).not.toMatch(/email/i);
    expect(reminders?.info).toMatch(/cloche/);
  });
});
