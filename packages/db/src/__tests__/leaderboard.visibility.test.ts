import { describe, expect, it } from "vitest";
import { LeaderboardVisibility } from "@prisma/client";
import {
  buildCurrentUserPosition,
  buildLeaderboard,
  resolveVisibility,
  type RawLeaderboardUser,
} from "../repositories/leaderboard.visibility.js";

// Distinctive PII values so a leak is unmistakable in assertions.
const SECRET_NAME = "Real Name";
const SECRET_USERNAME = "realuser";
const SECRET_AVATAR = "/avatars/secret.svg";

function rawUser(
  id: string,
  visibility: LeaderboardVisibility | null,
  xpTotal: number,
  publicProfile = true,
): RawLeaderboardUser {
  return {
    id,
    displayName: SECRET_NAME,
    username: SECRET_USERNAME,
    avatarUrl: SECRET_AVATAR,
    level: 5,
    xpTotal,
    streakDays: 3,
    preferences: visibility === null ? null : { leaderboardVisibility: visibility, publicProfile },
  };
}

// A userId that matches no row - so every row is treated as "another user".
const VIEWER = "viewer";

// ─── resolveVisibility ──────────────────────────────────────────────────────

describe("resolveVisibility", () => {
  it("falls back to ANONYMOUS when there is no preferences row", () => {
    expect(resolveVisibility(null)).toBe(LeaderboardVisibility.ANONYMOUS);
  });

  it("returns the stored visibility when a row exists", () => {
    expect(resolveVisibility({ leaderboardVisibility: LeaderboardVisibility.PUBLIC })).toBe(
      LeaderboardVisibility.PUBLIC,
    );
    expect(resolveVisibility({ leaderboardVisibility: LeaderboardVisibility.HIDDEN })).toBe(
      LeaderboardVisibility.HIDDEN,
    );
  });
});

// ─── buildLeaderboard - anonymization of OTHER users ──────────────────────────

describe("buildLeaderboard - other users", () => {
  it("nulls name, username, and avatar for an ANONYMOUS other user but keeps stats", () => {
    const [entry] = buildLeaderboard(
      [rawUser("anon-1", LeaderboardVisibility.ANONYMOUS, 100)],
      VIEWER,
    );
    expect(entry?.displayName).toBeNull();
    expect(entry?.username).toBeNull();
    expect(entry?.avatarUrl).toBeNull();
    expect(entry?.hasPublicProfile).toBe(false);
    expect(entry?.xpTotal).toBe(100);
    expect(entry?.level).toBe(5);
    expect(entry?.streakDays).toBe(3);
  });

  it("keeps full identity for a PUBLIC user with a public profile", () => {
    const [entry] = buildLeaderboard(
      [rawUser("pub-1", LeaderboardVisibility.PUBLIC, 100, true)],
      VIEWER,
    );
    expect(entry?.displayName).toBe(SECRET_NAME);
    expect(entry?.username).toBe(SECRET_USERNAME);
    expect(entry?.avatarUrl).toBe(SECRET_AVATAR);
    expect(entry?.hasPublicProfile).toBe(true);
  });

  it("shows the name but not a profile link for a PUBLIC user with a private profile", () => {
    const [entry] = buildLeaderboard(
      [rawUser("pub-2", LeaderboardVisibility.PUBLIC, 100, false)],
      VIEWER,
    );
    expect(entry?.displayName).toBe(SECRET_NAME);
    expect(entry?.hasPublicProfile).toBe(false);
  });

  it("treats a user with no preferences row as ANONYMOUS (privacy-first fallback)", () => {
    const [entry] = buildLeaderboard([rawUser("noprefs", null, 100)], VIEWER);
    expect(entry?.displayName).toBeNull();
    expect(entry?.username).toBeNull();
    expect(entry?.avatarUrl).toBeNull();
  });

  it("never serializes another user's ANONYMOUS/HIDDEN PII anywhere in the payload", () => {
    const result = buildLeaderboard(
      [
        rawUser("anon", LeaderboardVisibility.ANONYMOUS, 200),
        rawUser("hidden", LeaderboardVisibility.HIDDEN, 300),
        rawUser("noprefs", null, 100),
      ],
      VIEWER,
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(SECRET_NAME);
    expect(serialized).not.toContain(SECRET_USERNAME);
    expect(serialized).not.toContain(SECRET_AVATAR);
  });

  it("never includes a userId field on any row", () => {
    const result = buildLeaderboard(
      [
        rawUser("anon", LeaderboardVisibility.ANONYMOUS, 200),
        rawUser("pub", LeaderboardVisibility.PUBLIC, 100),
      ],
      VIEWER,
    );
    for (const entry of result) {
      expect(Object.keys(entry)).not.toContain("userId");
    }
  });
});

// ─── buildLeaderboard - the current user's own row ────────────────────────────

describe("buildLeaderboard - current user sees themselves", () => {
  it("reveals the current user's own identity even when they are ANONYMOUS", () => {
    const [entry] = buildLeaderboard([rawUser("me", LeaderboardVisibility.ANONYMOUS, 100)], "me");
    expect(entry?.isCurrentUser).toBe(true);
    expect(entry?.displayName).toBe(SECRET_NAME);
    expect(entry?.username).toBe(SECRET_USERNAME);
    expect(entry?.avatarUrl).toBe(SECRET_AVATAR);
    // But a private profile is never turned into a clickable link.
    expect(entry?.hasPublicProfile).toBe(false);
  });

  it("reveals self but strips OTHER anonymous users in the same list", () => {
    const result = buildLeaderboard(
      [
        rawUser("me", LeaderboardVisibility.ANONYMOUS, 200),
        rawUser("other", LeaderboardVisibility.ANONYMOUS, 100),
      ],
      "me",
    );
    const me = result.find((e) => e.isCurrentUser);
    const other = result.find((e) => !e.isCurrentUser);
    expect(me?.displayName).toBe(SECRET_NAME);
    expect(other?.displayName).toBeNull();
    expect(other?.username).toBeNull();
    expect(other?.avatarUrl).toBeNull();
  });

  it("sets isCurrentUser only on the matching row", () => {
    const result = buildLeaderboard(
      [
        rawUser("a", LeaderboardVisibility.PUBLIC, 300),
        rawUser("c", LeaderboardVisibility.ANONYMOUS, 200),
      ],
      "c",
    );
    expect(result.find((e) => e.xpTotal === 200)?.isCurrentUser).toBe(true);
    expect(result.find((e) => e.xpTotal === 300)?.isCurrentUser).toBe(false);
  });
});

// ─── buildLeaderboard - HIDDEN exclusion + ranks ──────────────────────────────

describe("buildLeaderboard - HIDDEN exclusion and ranking", () => {
  it("excludes HIDDEN users entirely from the result", () => {
    const result = buildLeaderboard(
      [
        rawUser("a", LeaderboardVisibility.PUBLIC, 300),
        rawUser("hidden", LeaderboardVisibility.HIDDEN, 250),
        rawUser("c", LeaderboardVisibility.ANONYMOUS, 200),
      ],
      VIEWER,
    );
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.xpTotal)).toEqual([300, 200]);
  });

  it("assigns continuous ranks over visible users so HIDDEN leaves no gap", () => {
    const result = buildLeaderboard(
      [
        rawUser("a", LeaderboardVisibility.PUBLIC, 300),
        rawUser("hidden", LeaderboardVisibility.HIDDEN, 250),
        rawUser("c", LeaderboardVisibility.ANONYMOUS, 200),
        rawUser("d", LeaderboardVisibility.PUBLIC, 150),
      ],
      VIEWER,
    );
    expect(result.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(result.map((e) => e.xpTotal)).toEqual([300, 200, 150]);
  });
});

// ─── buildCurrentUserPosition ─────────────────────────────────────────────────

describe("buildCurrentUserPosition", () => {
  it("returns rank null for a HIDDEN user", () => {
    const pos = buildCurrentUserPosition(rawUser("me", LeaderboardVisibility.HIDDEN, 100), 7);
    expect(pos.visibility).toBe(LeaderboardVisibility.HIDDEN);
    expect(pos.rank).toBeNull();
  });

  it("keeps the rank and reveals own identity for an ANONYMOUS user (their own data)", () => {
    const pos = buildCurrentUserPosition(rawUser("me", LeaderboardVisibility.ANONYMOUS, 100), 4);
    expect(pos.rank).toBe(4);
    expect(pos.displayName).toBe(SECRET_NAME);
    expect(pos.username).toBe(SECRET_USERNAME);
  });

  it("keeps rank and identity for a PUBLIC user", () => {
    const pos = buildCurrentUserPosition(rawUser("me", LeaderboardVisibility.PUBLIC, 100), 2);
    expect(pos.rank).toBe(2);
    expect(pos.displayName).toBe(SECRET_NAME);
  });
});
