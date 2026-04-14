"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const user_schema_js_1 = require("../user.schema.js");
// ─── usernameSchema ───────────────────────────────────────────────────────────
(0, vitest_1.describe)("usernameSchema", () => {
  (0, vitest_1.it)("accepts a valid lowercase alphanumeric username", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("jordan").success).toBe(true);
  });
  (0, vitest_1.it)("accepts a username with internal hyphens", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("cyber-learn").success).toBe(
      true,
    );
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("a-b-c").success).toBe(true);
  });
  (0, vitest_1.it)("accepts a username with numbers", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("user42").success).toBe(true);
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("42user").success).toBe(true);
  });
  (0, vitest_1.it)(
    "rejects a two-character username (min length is 3, regex {1,2} branch is unreachable)",
    () => {
      // The .min(3) check fires before the regex, so 2-char inputs are always rejected
      (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("ab").success).toBe(false);
      (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("a1").success).toBe(false);
    },
  );
  (0, vitest_1.it)("accepts a three-character username at min length", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("abc").success).toBe(true);
  });
  (0, vitest_1.it)("accepts a 32-character username at max length", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("a".repeat(32)).success).toBe(
      true,
    );
  });
  (0, vitest_1.it)("trims surrounding whitespace before validation", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("  jordan  ").success).toBe(
      true,
    );
  });
  (0, vitest_1.it)("rejects a username with a leading hyphen", () => {
    const result = user_schema_js_1.usernameSchema.safeParse("-jordan");
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects a username with a trailing hyphen", () => {
    const result = user_schema_js_1.usernameSchema.safeParse("jordan-");
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects a username shorter than 3 characters (after trim)", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("a").success).toBe(false);
  });
  (0, vitest_1.it)("rejects a username longer than 32 characters", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("a".repeat(33)).success).toBe(
      false,
    );
  });
  (0, vitest_1.it)("rejects uppercase letters", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("Jordan").success).toBe(false);
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("ADMIN").success).toBe(false);
  });
  (0, vitest_1.it)("rejects special characters other than hyphens", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("user_name").success).toBe(
      false,
    );
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("user.name").success).toBe(
      false,
    );
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("user@name").success).toBe(
      false,
    );
  });
  (0, vitest_1.it)("rejects an empty string", () => {
    (0, vitest_1.expect)(user_schema_js_1.usernameSchema.safeParse("").success).toBe(false);
  });
});
// ─── onboardingSchema ─────────────────────────────────────────────────────────
(0, vitest_1.describe)("onboardingSchema", () => {
  const validInput = { username: "jordan42", displayName: "Jordan" };
  (0, vitest_1.it)("accepts valid onboarding input", () => {
    (0, vitest_1.expect)(user_schema_js_1.onboardingSchema.safeParse(validInput).success).toBe(
      true,
    );
  });
  (0, vitest_1.it)("rejects missing username", () => {
    const result = user_schema_js_1.onboardingSchema.safeParse({ displayName: "Jordan" });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects invalid username", () => {
    const result = user_schema_js_1.onboardingSchema.safeParse({
      username: "-bad",
      displayName: "Jordan",
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects empty displayName", () => {
    const result = user_schema_js_1.onboardingSchema.safeParse({
      username: "jordan42",
      displayName: "",
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects displayName longer than 64 characters", () => {
    const result = user_schema_js_1.onboardingSchema.safeParse({
      username: "jordan42",
      displayName: "a".repeat(65),
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("trims displayName whitespace", () => {
    const result = user_schema_js_1.onboardingSchema.safeParse({
      username: "jordan42",
      displayName: "  Jordan  ",
    });
    (0, vitest_1.expect)(result.success).toBe(true);
    if (result.success) {
      (0, vitest_1.expect)(result.data.displayName).toBe("Jordan");
    }
  });
  (0, vitest_1.it)("accepts displayName at exactly 64 characters", () => {
    const result = user_schema_js_1.onboardingSchema.safeParse({
      username: "jordan42",
      displayName: "a".repeat(64),
    });
    (0, vitest_1.expect)(result.success).toBe(true);
  });
});
// ─── updateProfileSchema ──────────────────────────────────────────────────────
(0, vitest_1.describe)("updateProfileSchema", () => {
  (0, vitest_1.it)("accepts an empty object (all fields optional)", () => {
    (0, vitest_1.expect)(user_schema_js_1.updateProfileSchema.safeParse({}).success).toBe(true);
  });
  (0, vitest_1.it)("accepts a valid bio within 280 characters", () => {
    (0, vitest_1.expect)(
      user_schema_js_1.updateProfileSchema.safeParse({ bio: "I love cybersecurity." }).success,
    ).toBe(true);
  });
  (0, vitest_1.it)("rejects bio longer than 280 characters", () => {
    const result = user_schema_js_1.updateProfileSchema.safeParse({ bio: "a".repeat(281) });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("accepts a null avatarUrl (clearing the avatar)", () => {
    (0, vitest_1.expect)(
      user_schema_js_1.updateProfileSchema.safeParse({ avatarUrl: null }).success,
    ).toBe(true);
  });
  (0, vitest_1.it)("rejects a non-URL string for avatarUrl", () => {
    (0, vitest_1.expect)(
      user_schema_js_1.updateProfileSchema.safeParse({ avatarUrl: "not-a-url" }).success,
    ).toBe(false);
  });
  (0, vitest_1.it)("accepts a valid URL for avatarUrl", () => {
    (0, vitest_1.expect)(
      user_schema_js_1.updateProfileSchema.safeParse({
        avatarUrl: "https://example.com/avatar.png",
      }).success,
    ).toBe(true);
  });
});
//# sourceMappingURL=user.schema.test.js.map
