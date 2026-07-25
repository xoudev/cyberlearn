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

  it("rejects the control characters the URL parser strips", () => {
    // Sent as %09 / %0A / %0D and decoded by searchParams.get(). Each of these
    // passed the "starts with a single slash" test and then resolved
    // off-origin once handed to the URL constructor.
    for (const control of ["\t", "\n", "\r"]) {
      const candidate = `/${control}/example.com`;
      expect(new URL(candidate, "https://cyberlearn.fr").origin).toBe("https://example.com");
      expect(authRedirectSchema.safeParse(candidate).success).toBe(false);
    }
  });

  it("rejects the rest of the C0 range and DEL", () => {
    for (const control of ["\u0000", "\u000B", "\u001F", "\u007F"]) {
      expect(authRedirectSchema.safeParse(`/${control}/example.com`).success).toBe(false);
    }
  });

  it("still accepts ordinary in-site paths", () => {
    expect(authRedirectSchema.safeParse("/dashboard").success).toBe(true);
    expect(authRedirectSchema.safeParse("/lessons/sql-injection?tab=qa").success).toBe(true);
    expect(authRedirectSchema.parse(undefined)).toBe("/dashboard");
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
