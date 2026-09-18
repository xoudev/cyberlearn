import { describe, expect, it } from "vitest";
import {
  buildFriendsBoard,
  type RawFriendsBoardUser,
} from "../repositories/leaderboard.friends.js";

function person(
  id: string,
  xpTotal: number,
  {
    optedIn = true,
    role = "STUDENT" as RawFriendsBoardUser["role"],
    hasPreferences = true,
    username = `u-${id}` as string | null,
  } = {},
): RawFriendsBoardUser {
  return {
    id,
    displayName: `Nom ${id}`,
    username,
    avatarUrl: `/a/${id}.png`,
    level: 4,
    xpTotal,
    streakDays: 3,
    role,
    preferences: hasPreferences ? { friendsLeaderboard: optedIn } : null,
  };
}

describe("the friends board", () => {
  it("ranks the friends who opted in, in the order they arrive", () => {
    const board = buildFriendsBoard([person("a", 900), person("me", 500), person("b", 100)], "me");
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(board.map((e) => e.isCurrentUser)).toEqual([false, true, false]);
  });

  it("names everybody it lists, because everybody it lists asked to be named", () => {
    const [entry] = buildFriendsBoard([person("a", 900)], "me");
    expect(entry).toMatchObject({
      displayName: "Nom a",
      username: "u-a",
      avatarUrl: "/a/a.png",
      // A friend can open a friend's profile whatever its own setting.
      hasPublicProfile: true,
    });
  });

  it("leaves out a friend who has not opted in, without leaving a gap", () => {
    const board = buildFriendsBoard(
      [person("a", 900), person("quiet", 700, { optedIn: false }), person("b", 100)],
      "me",
    );
    expect(board.map((e) => e.username)).toEqual(["u-a", "u-b"]);
    // Ranks are continuous over who is left: a missing person must not be
    // deducible from a hole in the numbering.
    expect(board.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("treats a person with no preferences row as not having opted in", () => {
    const board = buildFriendsBoard([person("new", 900, { hasPreferences: false })], "me");
    expect(board).toEqual([]);
  });

  it("puts the reader on their own board even when they have not opted in", () => {
    // It is their own data, and a board of friends missing the reader reads as
    // a bug. It does not put them on anybody else's - that still takes the
    // switch, which the tests above cover.
    const board = buildFriendsBoard([person("me", 500, { optedIn: false })], "me");
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({ isCurrentUser: true, displayName: "Nom me" });
  });

  it("ranks students only, reader included", () => {
    const board = buildFriendsBoard(
      [person("prof", 9000, { role: "TEACHER" }), person("me", 500), person("b", 100)],
      "me",
    );
    expect(board.map((e) => e.username)).toEqual(["u-me", "u-b"]);

    const asTeacher = buildFriendsBoard([person("me", 500, { role: "TEACHER" })], "me");
    expect(asTeacher).toEqual([]);
  });

  it("offers no profile link to somebody who has no handle yet", () => {
    const [entry] = buildFriendsBoard([person("a", 900, { username: null })], "me");
    expect(entry?.hasPublicProfile).toBe(false);
  });

  it("is empty rather than broken when nobody qualifies", () => {
    expect(buildFriendsBoard([], "me")).toEqual([]);
  });
});
