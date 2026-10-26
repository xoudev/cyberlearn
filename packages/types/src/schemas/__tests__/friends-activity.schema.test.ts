import { describe, expect, it } from "vitest";
import { friendsActivityReplySchema } from "../friends-activity.schema";

const ITEM = {
  key: "lesson:alex:tcp-handshake",
  kind: "lesson",
  at: "2026-10-21T08:30:00.000Z",
  title: "La poignée de main TCP",
  friend: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Alex",
    username: "alex",
    avatarSrc: null,
    profileOpen: true,
    duelOpen: false,
  },
};

describe("friendsActivityReplySchema", () => {
  it("reads the friends' moments the route sends", () => {
    const parsed = friendsActivityReplySchema.safeParse({
      ok: true,
      hasFriends: true,
      items: [ITEM],
    });
    expect(parsed.success).toBe(true);
  });

  it("reads a reader with no friend, and friends who have been quiet", () => {
    expect(
      friendsActivityReplySchema.safeParse({ ok: true, hasFriends: false, items: [] }).success,
    ).toBe(true);
    expect(
      friendsActivityReplySchema.safeParse({ ok: true, hasFriends: true, items: [] }).success,
    ).toBe(true);
  });

  it("reads the route's refusal, with or without its reason", () => {
    expect(
      friendsActivityReplySchema.safeParse({ ok: false, error: "Non authentifié." }).success,
    ).toBe(true);
    expect(friendsActivityReplySchema.safeParse({ ok: false }).success).toBe(true);
  });

  it("refuses a reply with no items, which the home tab would read `length` of", () => {
    expect(friendsActivityReplySchema.safeParse({ ok: true, hasFriends: true }).success).toBe(
      false,
    );
    expect(
      friendsActivityReplySchema.safeParse({ ok: true, hasFriends: true, items: null }).success,
    ).toBe(false);
  });

  it("refuses a moment of a kind the app does not word, or without its friend", () => {
    expect(
      friendsActivityReplySchema.safeParse({
        ok: true,
        hasFriends: true,
        items: [{ ...ITEM, kind: "quest" }],
      }).success,
    ).toBe(false);
    expect(
      friendsActivityReplySchema.safeParse({
        ok: true,
        hasFriends: true,
        items: [{ key: ITEM.key, kind: ITEM.kind, at: ITEM.at, title: ITEM.title }],
      }).success,
    ).toBe(false);
  });

  it("refuses anything that is not a reply", () => {
    expect(friendsActivityReplySchema.safeParse(null).success).toBe(false);
    expect(friendsActivityReplySchema.safeParse("ok").success).toBe(false);
    expect(friendsActivityReplySchema.safeParse({}).success).toBe(false);
  });
});
