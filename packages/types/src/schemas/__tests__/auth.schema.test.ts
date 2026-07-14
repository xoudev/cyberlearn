import { describe, expect, it } from "vitest";
import {
  authRedirectSchema,
  mfaCodeSchema,
  passwordSignInSchema,
  passwordSignUpSchema,
  passwordUpdateSchema,
} from "../auth.schema.js";

describe("passwordSignInSchema", () => {
  it("normalizes the email address", () => {
    const result = passwordSignInSchema.safeParse({
      email: "  Reviewer@CyberLearn.FR ",
      password: "existing-password",
      redirectTo: "/dashboard",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("reviewer@cyberlearn.fr");
  });
});

describe("passwordSignUpSchema", () => {
  it("accepts a strong matching password", () => {
    expect(
      passwordSignUpSchema.safeParse({
        email: "student@example.com",
        password: "secure-learning-2026",
        passwordConfirmation: "secure-learning-2026",
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    expect(
      passwordSignUpSchema.safeParse({
        email: "student@example.com",
        password: "secure-learning-2026",
        passwordConfirmation: "different-password-2026",
      }).success,
    ).toBe(false);
  });
});

describe("passwordUpdateSchema", () => {
  it("rejects short passwords", () => {
    expect(
      passwordUpdateSchema.safeParse({
        password: "short1",
        passwordConfirmation: "short1",
      }).success,
    ).toBe(false);
  });
});

describe("authRedirectSchema", () => {
  it("rejects external and protocol-relative redirects", () => {
    expect(authRedirectSchema.safeParse("https://example.com").success).toBe(false);
    expect(authRedirectSchema.safeParse("//example.com").success).toBe(false);
  });
});

describe("mfaCodeSchema", () => {
  it("accepts a six-digit TOTP code", () => {
    expect(mfaCodeSchema.safeParse("123456").success).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(mfaCodeSchema.safeParse("12345a").success).toBe(false);
  });
});
