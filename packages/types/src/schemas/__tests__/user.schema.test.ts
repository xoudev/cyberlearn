import { describe, expect, it } from "vitest";
import {
  usernameSchema,
  onboardingSchema,
  updateProfileSchema,
  leaderboardVisibilitySchema,
  updatePrivacySchema,
} from "../user.schema.js";

// ─── usernameSchema ───────────────────────────────────────────────────────────

describe("usernameSchema", () => {
  it("accepts a valid lowercase alphanumeric username", () => {
    expect(usernameSchema.safeParse("jordan").success).toBe(true);
  });

  it("accepts a username with internal hyphens", () => {
    expect(usernameSchema.safeParse("cyber-learn").success).toBe(true);
    expect(usernameSchema.safeParse("a-b-c").success).toBe(true);
  });

  it("accepts a username with numbers", () => {
    expect(usernameSchema.safeParse("user42").success).toBe(true);
    expect(usernameSchema.safeParse("42user").success).toBe(true);
  });

  it("rejects a two-character username (min length is 3, regex {1,2} branch is unreachable)", () => {
    // The .min(3) check fires before the regex, so 2-char inputs are always rejected
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a1").success).toBe(false);
  });

  it("accepts a three-character username at min length", () => {
    expect(usernameSchema.safeParse("abc").success).toBe(true);
  });

  it("accepts a 32-character username at max length", () => {
    expect(usernameSchema.safeParse("a".repeat(32)).success).toBe(true);
  });

  it("trims surrounding whitespace before validation", () => {
    expect(usernameSchema.safeParse("  jordan  ").success).toBe(true);
  });

  it("rejects a username with a leading hyphen", () => {
    const result = usernameSchema.safeParse("-jordan");
    expect(result.success).toBe(false);
  });

  it("rejects a username with a trailing hyphen", () => {
    const result = usernameSchema.safeParse("jordan-");
    expect(result.success).toBe(false);
  });

  it("rejects a username shorter than 3 characters (after trim)", () => {
    expect(usernameSchema.safeParse("a").success).toBe(false);
  });

  it("rejects a username longer than 32 characters", () => {
    expect(usernameSchema.safeParse("a".repeat(33)).success).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(usernameSchema.safeParse("Jordan").success).toBe(false);
    expect(usernameSchema.safeParse("ADMIN").success).toBe(false);
  });

  it("rejects special characters other than hyphens", () => {
    expect(usernameSchema.safeParse("user_name").success).toBe(false);
    expect(usernameSchema.safeParse("user.name").success).toBe(false);
    expect(usernameSchema.safeParse("user@name").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(usernameSchema.safeParse("").success).toBe(false);
  });
});

// ─── onboardingSchema ─────────────────────────────────────────────────────────

describe("onboardingSchema", () => {
  const validInput = { username: "jordan42", displayName: "Jordan" };

  it("accepts valid onboarding input", () => {
    expect(onboardingSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects missing username", () => {
    const result = onboardingSchema.safeParse({ displayName: "Jordan" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid username", () => {
    const result = onboardingSchema.safeParse({ username: "-bad", displayName: "Jordan" });
    expect(result.success).toBe(false);
  });

  it("rejects empty displayName", () => {
    const result = onboardingSchema.safeParse({ username: "jordan42", displayName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects displayName longer than 64 characters", () => {
    const result = onboardingSchema.safeParse({
      username: "jordan42",
      displayName: "a".repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it("trims displayName whitespace", () => {
    const result = onboardingSchema.safeParse({
      username: "jordan42",
      displayName: "  Jordan  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Jordan");
    }
  });

  it("accepts displayName at exactly 64 characters", () => {
    const result = onboardingSchema.safeParse({
      username: "jordan42",
      displayName: "a".repeat(64),
    });
    expect(result.success).toBe(true);
  });
});

// ─── updateProfileSchema ──────────────────────────────────────────────────────

describe("updateProfileSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a valid bio within 280 characters", () => {
    expect(updateProfileSchema.safeParse({ bio: "I love cybersecurity." }).success).toBe(true);
  });

  it("rejects bio longer than 280 characters", () => {
    const result = updateProfileSchema.safeParse({ bio: "a".repeat(281) });
    expect(result.success).toBe(false);
  });

  it("accepts a null avatarUrl (clearing the avatar)", () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: null }).success).toBe(true);
  });

  it("rejects a non-URL string for avatarUrl", () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: "not-a-url" }).success).toBe(false);
  });

  it("accepts a valid URL for avatarUrl", () => {
    expect(
      updateProfileSchema.safeParse({ avatarUrl: "https://example.com/avatar.png" }).success,
    ).toBe(true);
  });
});

// ─── leaderboardVisibilitySchema ──────────────────────────────────────────────

describe("leaderboardVisibilitySchema", () => {
  it("accepts the three valid enum values", () => {
    expect(leaderboardVisibilitySchema.safeParse("HIDDEN").success).toBe(true);
    expect(leaderboardVisibilitySchema.safeParse("ANONYMOUS").success).toBe(true);
    expect(leaderboardVisibilitySchema.safeParse("PUBLIC").success).toBe(true);
  });

  it("rejects an arbitrary string outside the enum", () => {
    expect(leaderboardVisibilitySchema.safeParse("ADMIN").success).toBe(false);
    expect(leaderboardVisibilitySchema.safeParse("EVERYONE").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(leaderboardVisibilitySchema.safeParse("").success).toBe(false);
  });

  it("rejects a non-string value", () => {
    expect(leaderboardVisibilitySchema.safeParse(42).success).toBe(false);
  });

  it("rejects lowercase variants (enum is case-sensitive)", () => {
    expect(leaderboardVisibilitySchema.safeParse("public").success).toBe(false);
  });
});

// ─── updatePrivacySchema ──────────────────────────────────────────────────────

describe("updatePrivacySchema", () => {
  const VALID = {
    leaderboardVisibility: "ANONYMOUS",
    publicProfile: true,
    friendsLeaderboard: false,
  };

  it("accepts a full, valid privacy state", () => {
    expect(updatePrivacySchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects an arbitrary visibility value", () => {
    expect(
      updatePrivacySchema.safeParse({ ...VALID, leaderboardVisibility: "ADMIN" }).success,
    ).toBe(false);
    expect(
      updatePrivacySchema.safeParse({ ...VALID, leaderboardVisibility: "EVERYONE" }).success,
    ).toBe(false);
  });

  it("rejects a partial submission: the form always sends its whole state", () => {
    // Each field missing in turn. A schema that let one through would take the
    // default for it and silently overwrite what the person had chosen.
    const withoutOne = [
      { publicProfile: VALID.publicProfile, friendsLeaderboard: VALID.friendsLeaderboard },
      {
        leaderboardVisibility: VALID.leaderboardVisibility,
        friendsLeaderboard: VALID.friendsLeaderboard,
      },
      { leaderboardVisibility: VALID.leaderboardVisibility, publicProfile: VALID.publicProfile },
    ];
    for (const partial of withoutOne) {
      expect(updatePrivacySchema.safeParse(partial).success).toBe(false);
    }
  });

  it("rejects a booleanish string rather than coercing it", () => {
    expect(updatePrivacySchema.safeParse({ ...VALID, publicProfile: "true" }).success).toBe(false);
    expect(updatePrivacySchema.safeParse({ ...VALID, friendsLeaderboard: "true" }).success).toBe(
      false,
    );
  });

  it("keeps the friends board independent of the public one", () => {
    // Masked on the platform, named to five friends - and the other way round.
    // Neither combination is a contradiction the schema should refuse.
    expect(
      updatePrivacySchema.safeParse({
        ...VALID,
        leaderboardVisibility: "HIDDEN",
        friendsLeaderboard: true,
      }).success,
    ).toBe(true);
    expect(
      updatePrivacySchema.safeParse({
        ...VALID,
        leaderboardVisibility: "PUBLIC",
        friendsLeaderboard: false,
      }).success,
    ).toBe(true);
  });
});
