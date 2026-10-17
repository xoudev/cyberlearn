import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES, notificationMeta } from "../notification-meta";

/**
 * Each kind of notification gets its own mark on the inbox screen, for the
 * types the database really has: the screen once keyed on two types nothing
 * sends and drew eleven real ones as the same neutral dot.
 */

// enum NotificationType, packages/db/prisma/schema.prisma.
const DATABASE_TYPES = [
  "REVIEW_REMINDER",
  "BADGE_EARNED",
  "LEVEL_UP",
  "PATH_COMPLETED",
  "CERTIFICATE_ISSUED",
  "ANNOUNCEMENT",
  "TICKET_UPDATE",
  "CLASS_ENROLLED",
  "LESSON_ASSIGNED",
  "PATH_ASSIGNED",
  "NOTE_SHARED",
  "MODERATION_ALERT",
  "FORUM_REPLY",
  "FRIEND_REQUEST",
  "FRIEND_ACCEPTED",
  "DUEL_INVITE",
  "DUEL_RESULT",
  "TOURNAMENT_ANNOUNCED",
];

describe("notificationMeta", () => {
  it("knows exactly the types the database has", () => {
    expect([...NOTIFICATION_TYPES].sort()).toEqual([...DATABASE_TYPES].sort());
  });

  it("gives every type a glyph of its own, never the neutral dot", () => {
    const icons = NOTIFICATION_TYPES.map((type) => notificationMeta(type).icon);
    expect(icons).not.toContain("•");
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("marks the reminders, the friends and the class notices the inbox used to blank", () => {
    for (const type of ["REVIEW_REMINDER", "FRIEND_REQUEST", "NOTE_SHARED", "CLASS_ENROLLED"]) {
      expect(notificationMeta(type).icon).not.toBe("•");
    }
  });

  it("falls back to a neutral dot for a type this build does not know", () => {
    expect(notificationMeta("REVIEW_DUE")).toEqual({ icon: "•", color: expect.any(String) });
    expect(notificationMeta("LEAGUE").icon).toBe("•");
  });
});
