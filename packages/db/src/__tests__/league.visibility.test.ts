import { describe, expect, it } from "vitest";
import { LeaderboardVisibility } from "@prisma/client";
import { buildPodLadder, type RawPodMember } from "../repositories/league.visibility.js";

// Distinctive PII values so a leak is unmistakable in assertions.
const SECRET_NAME = "Real Name";
const SECRET_USERNAME = "realuser";
const SECRET_AVATAR = "/avatars/secret.svg";

function rawPodMember(
  id: string,
  visibility: LeaderboardVisibility | null,
  seasonXp: number,
  publicProfile = true,
): RawPodMember {
  return {
    id,
    displayName: SECRET_NAME,
    username: SECRET_USERNAME,
    avatarUrl: SECRET_AVATAR,
    level: 5,
    seasonXp,
    preferences: visibility === null ? null : { leaderboardVisibility: visibility, publicProfile },
  };
}

// A userId matching no row, so every member is treated as "another user".
const VIEWER = "viewer";

// Build a full PUBLIC pod of `n` members, pre-sorted by seasonXp desc so the
// index order equals the rank order (buildPodLadder ranks by position).
function publicPod(n: number): RawPodMember[] {
  return Array.from({ length: n }, (_unused, i) =>
    rawPodMember(`m${String(i)}`, LeaderboardVisibility.PUBLIC, (n - i) * 100),
  );
}

// ─── Anonymization of OTHER members ───────────────────────────────────────────

describe("buildPodLadder - other members", () => {
  it("nulls name, username, and avatar for an ANONYMOUS other member but keeps stats", () => {
    const [entry] = buildPodLadder(
      [rawPodMember("anon-1", LeaderboardVisibility.ANONYMOUS, 100)],
      VIEWER,
    );
    expect(entry?.displayName).toBeNull();
    expect(entry?.username).toBeNull();
    expect(entry?.avatarUrl).toBeNull();
    expect(entry?.hasPublicProfile).toBe(false);
    expect(entry?.seasonXp).toBe(100);
    expect(entry?.level).toBe(5);
  });

  it("keeps full identity for a PUBLIC member with a public profile", () => {
    const [entry] = buildPodLadder(
      [rawPodMember("pub-1", LeaderboardVisibility.PUBLIC, 100, true)],
      VIEWER,
    );
    expect(entry?.displayName).toBe(SECRET_NAME);
    expect(entry?.username).toBe(SECRET_USERNAME);
    expect(entry?.avatarUrl).toBe(SECRET_AVATAR);
    expect(entry?.hasPublicProfile).toBe(true);
  });

  it("shows the name but not a profile link for a PUBLIC member with a private profile", () => {
    const [entry] = buildPodLadder(
      [rawPodMember("pub-2", LeaderboardVisibility.PUBLIC, 100, false)],
      VIEWER,
    );
    expect(entry?.displayName).toBe(SECRET_NAME);
    expect(entry?.hasPublicProfile).toBe(false);
  });

  it("treats a member with no preferences row as ANONYMOUS (privacy-first fallback)", () => {
    const [entry] = buildPodLadder([rawPodMember("noprefs", null, 100)], VIEWER);
    expect(entry?.displayName).toBeNull();
    expect(entry?.username).toBeNull();
    expect(entry?.avatarUrl).toBeNull();
  });
});

// ─── The KEY difference from the leaderboard: HIDDEN is KEPT, not dropped ──────

describe("buildPodLadder - HIDDEN members are kept (ranked) but anonymized", () => {
  it("keeps a HIDDEN member in the pod with all PII nulled (inverse of the leaderboard)", () => {
    const result = buildPodLadder(
      [
        rawPodMember("pub", LeaderboardVisibility.PUBLIC, 300),
        rawPodMember("hidden", LeaderboardVisibility.HIDDEN, 250),
        rawPodMember("anon", LeaderboardVisibility.ANONYMOUS, 200),
      ],
      VIEWER,
    );
    // All three remain - dropping HIDDEN would shrink the pod + corrupt zones.
    expect(result).toHaveLength(3);
    const hidden = result.find((e) => e.rank === 2);
    expect(hidden?.displayName).toBeNull();
    expect(hidden?.username).toBeNull();
    expect(hidden?.avatarUrl).toBeNull();
  });

  it("assigns continuous ranks 1..n over ALL members including HIDDEN (no gap)", () => {
    const result = buildPodLadder(
      [
        rawPodMember("a", LeaderboardVisibility.PUBLIC, 300),
        rawPodMember("hidden", LeaderboardVisibility.HIDDEN, 250),
        rawPodMember("c", LeaderboardVisibility.ANONYMOUS, 200),
        rawPodMember("d", LeaderboardVisibility.PUBLIC, 150),
      ],
      VIEWER,
    );
    expect(result.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
    expect(result.map((e) => e.seasonXp)).toEqual([300, 250, 200, 150]);
  });
});

// ─── The current user always sees themselves ─────────────────────────────────

describe("buildPodLadder - current user sees themselves", () => {
  it("reveals the current user's own identity even when they are ANONYMOUS", () => {
    const [entry] = buildPodLadder(
      [rawPodMember("me", LeaderboardVisibility.ANONYMOUS, 100)],
      "me",
    );
    expect(entry?.isCurrentUser).toBe(true);
    expect(entry?.displayName).toBe(SECRET_NAME);
    expect(entry?.username).toBe(SECRET_USERNAME);
    expect(entry?.avatarUrl).toBe(SECRET_AVATAR);
    expect(entry?.hasPublicProfile).toBe(false);
  });

  it("reveals the current user's own identity even when they are HIDDEN", () => {
    const [entry] = buildPodLadder([rawPodMember("me", LeaderboardVisibility.HIDDEN, 100)], "me");
    expect(entry?.isCurrentUser).toBe(true);
    expect(entry?.displayName).toBe(SECRET_NAME);
  });

  it("reveals self but strips OTHER anonymous/hidden members in the same pod", () => {
    const result = buildPodLadder(
      [
        rawPodMember("me", LeaderboardVisibility.ANONYMOUS, 300),
        rawPodMember("other-anon", LeaderboardVisibility.ANONYMOUS, 200),
        rawPodMember("other-hidden", LeaderboardVisibility.HIDDEN, 100),
      ],
      "me",
    );
    const me = result.find((e) => e.isCurrentUser);
    const others = result.filter((e) => !e.isCurrentUser);
    expect(me?.displayName).toBe(SECRET_NAME);
    for (const other of others) {
      expect(other.displayName).toBeNull();
      expect(other.username).toBeNull();
      expect(other.avatarUrl).toBeNull();
    }
  });
});

// ─── Promotion / relegation zones ────────────────────────────────────────────

describe("buildPodLadder - promotion/relegation zones", () => {
  it("marks the top 4 promotion and bottom 3 relegation in a full pod of 15", () => {
    const result = buildPodLadder(publicPod(15), VIEWER);
    const promoted = result.filter((e) => e.promotion).map((e) => e.rank);
    const relegated = result.filter((e) => e.relegation).map((e) => e.rank);
    expect(promoted).toEqual([1, 2, 3, 4]);
    expect(relegated).toEqual([13, 14, 15]);
    // The safe middle is neither.
    for (const e of result.filter((x) => x.rank >= 5 && x.rank <= 12)) {
      expect(e.promotion).toBe(false);
      expect(e.relegation).toBe(false);
    }
  });

  it("shrinks the relegation zone without overlapping promotion in a small pod of 5", () => {
    const result = buildPodLadder(publicPod(5), VIEWER);
    expect(result.filter((e) => e.promotion).map((e) => e.rank)).toEqual([1, 2, 3, 4]);
    expect(result.filter((e) => e.relegation).map((e) => e.rank)).toEqual([5]);
  });
});

// ─── PII never escapes the chokepoint ────────────────────────────────────────

describe("buildPodLadder - no PII / no userId leaks", () => {
  it("never serializes another member's ANONYMOUS/HIDDEN PII anywhere in the payload", () => {
    const serialized = JSON.stringify(
      buildPodLadder(
        [
          rawPodMember("anon", LeaderboardVisibility.ANONYMOUS, 200),
          rawPodMember("hidden", LeaderboardVisibility.HIDDEN, 300),
          rawPodMember("noprefs", null, 100),
        ],
        VIEWER,
      ),
    );
    expect(serialized).not.toContain(SECRET_NAME);
    expect(serialized).not.toContain(SECRET_USERNAME);
    expect(serialized).not.toContain(SECRET_AVATAR);
  });

  it("never includes a userId field on any row", () => {
    const result = buildPodLadder(
      [
        rawPodMember("anon", LeaderboardVisibility.ANONYMOUS, 200),
        rawPodMember("pub", LeaderboardVisibility.PUBLIC, 100),
      ],
      VIEWER,
    );
    for (const entry of result) {
      expect(Object.keys(entry)).not.toContain("userId");
      expect(Object.keys(entry)).not.toContain("id");
    }
  });
});
