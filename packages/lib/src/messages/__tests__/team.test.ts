import { describe, expect, it } from "vitest";
import { readTeamNotice, teamMessageSeenAt } from "../team";

/**
 * Whether the learner saw a message from the team: its notification read, or
 * the conversation read since, whichever came first.
 */

const at = (iso: string): Date => new Date(iso);
const MESSAGE = { id: "m-2", createdAt: at("2026-11-25T10:00:00Z") };

describe("readTeamNotice", () => {
  it("reads a team notice's conversation and message", () => {
    expect(
      readTeamNotice({ teamConversationId: "c", messageId: "m" }, at("2026-11-25T11:00:00Z")),
    ).toEqual({ readAt: at("2026-11-25T11:00:00Z"), conversationId: "c", messageId: "m" });
    expect(readTeamNotice({ teamConversationId: "c" }, at("2026-11-25T11:00:00Z"))).toMatchObject({
      messageId: null,
    });
  });

  it("is null for an unread notice or another kind", () => {
    expect(readTeamNotice({ teamConversationId: "c" }, null)).toBeNull();
    expect(readTeamNotice({ announcementId: "a" }, at("2026-11-25T11:00:00Z"))).toBeNull();
    expect(readTeamNotice(null, at("2026-11-25T11:00:00Z"))).toBeNull();
  });
});

describe("teamMessageSeenAt", () => {
  it("keeps the moment the message was first seen, whatever the conversation's last read", () => {
    const stamped = { ...MESSAGE, seenAt: at("2026-11-25T10:10:00Z") };
    expect(teamMessageSeenAt(stamped, at("2026-11-25T16:00:00Z"), [])).toEqual(
      at("2026-11-25T10:10:00Z"),
    );
  });

  it("does not take a later conversation read for a message that has its own stamp field empty", () => {
    // seenAt null: opened since? markRead would have stamped it; only an old
    // message (no field) falls back on the conversation's read.
    expect(
      teamMessageSeenAt({ ...MESSAGE, seenAt: null }, at("2026-11-25T09:00:00Z"), []),
    ).toBeNull();
  });

  it("is unseen when nothing was read after it", () => {
    expect(teamMessageSeenAt(MESSAGE, at("2026-11-25T09:00:00Z"), [])).toBeNull();
    expect(teamMessageSeenAt(MESSAGE, null, [])).toBeNull();
  });

  it("is seen when its own notification was read, even before the conversation", () => {
    const notice = { readAt: at("2026-11-25T10:05:00Z"), conversationId: "c", messageId: "m-2" };
    expect(teamMessageSeenAt(MESSAGE, at("2026-11-25T12:00:00Z"), [notice])).toEqual(
      at("2026-11-25T10:05:00Z"),
    );
  });

  it("does not take another message's notification for this one", () => {
    const older = { readAt: at("2026-11-25T10:30:00Z"), conversationId: "c", messageId: "m-1" };
    expect(teamMessageSeenAt(MESSAGE, null, [older])).toBeNull();
  });

  it("takes the conversation read since, and an old notice read after it", () => {
    expect(teamMessageSeenAt(MESSAGE, at("2026-11-25T11:00:00Z"), [])).toEqual(
      at("2026-11-25T11:00:00Z"),
    );
    const legacy = { readAt: at("2026-11-25T10:20:00Z"), conversationId: "c", messageId: null };
    expect(teamMessageSeenAt(MESSAGE, null, [legacy])).toEqual(at("2026-11-25T10:20:00Z"));
  });
});
