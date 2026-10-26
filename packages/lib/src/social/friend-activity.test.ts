import { describe, expect, it } from "vitest";
import {
  FRIEND_ACTIVITY_LENGTH,
  friendActivityText,
  isFriendsLatest,
  mergeFriendActivity,
  type FriendActivityMoment,
} from "./friend-activity.js";

function moment(key: string, at: string, kind: FriendActivityMoment["kind"] = "lesson") {
  return { key, at, kind, title: key };
}

describe("mergeFriendActivity", () => {
  it("merges every source on its dates, the most recent first", () => {
    const merged = mergeFriendActivity([
      [moment("l1", "2026-10-10T10:00:00Z"), moment("l2", "2026-10-01T10:00:00Z")],
      [moment("b1", "2026-10-12T10:00:00Z", "badge")],
      [moment("d1", "2026-10-05T10:00:00Z", "duel")],
    ]);
    expect(merged.map((m) => m.key)).toEqual(["b1", "l1", "d1", "l2"]);
  });

  it("keeps the head of the whole, not of one source", () => {
    const lessons = Array.from({ length: 10 }, (_, i) =>
      moment(`l${String(i)}`, `2026-09-${String(10 + i)}T10:00:00Z`),
    );
    const merged = mergeFriendActivity([lessons, [moment("b", "2026-10-15T10:00:00Z", "badge")]]);
    expect(merged).toHaveLength(FRIEND_ACTIVITY_LENGTH);
    expect(merged[0]?.key).toBe("b");
    expect(merged[1]?.key).toBe("l9");
  });

  it("orders two moments of the same instant the same way every time", () => {
    const at = "2026-10-10T10:00:00Z";
    const one = mergeFriendActivity([[moment("b", at)], [moment("a", at)]]);
    const two = mergeFriendActivity([[moment("a", at)], [moment("b", at)]]);
    expect(one.map((m) => m.key)).toEqual(["a", "b"]);
    expect(two.map((m) => m.key)).toEqual(["a", "b"]);
  });

  it("leaves out a moment without a readable date, and honours the limit", () => {
    expect(mergeFriendActivity([[moment("x", "not a date")]])).toEqual([]);
    expect(mergeFriendActivity([[moment("a", "2026-10-10T10:00:00Z")]], 0)).toEqual([]);
  });
});

describe("friendActivityText", () => {
  it("says what the friend did, in the site's words", () => {
    expect(friendActivityText("lesson", "Les ports")).toBe("a terminé la leçon « Les ports »");
    expect(friendActivityText("duel", "Réseau")).toBe("a gagné un duel sur « Réseau »");
  });
});

describe("isFriendsLatest", () => {
  it("offers a duel once per friend, on their most recent moment", () => {
    const items = [
      { key: "1", friend: { id: "alex" } },
      { key: "2", friend: { id: "sam" } },
      { key: "3", friend: { id: "alex" } },
    ];
    expect(items.map((_, i) => isFriendsLatest(items, i))).toEqual([true, true, false]);
    expect(isFriendsLatest(items, 9)).toBe(false);
  });
});
