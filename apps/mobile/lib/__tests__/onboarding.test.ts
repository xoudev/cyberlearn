import { describe, expect, it } from "vitest";
import { handleInput, onboardingCompleteIn, onboardingStepFor } from "../onboarding";

describe("where signing up resumes", () => {
  it("starts at the identity step without a handle", () => {
    expect(onboardingStepFor({ username: null, onboardingComplete: false })).toBe("profile");
    expect(onboardingStepFor({ username: "", onboardingComplete: true })).toBe("profile");
  });

  it("resumes at the avatar step with a handle and no completion, as the site does", () => {
    expect(onboardingStepFor({ username: "alex", onboardingComplete: false })).toBe("avatar");
  });

  it("is done once the flag is set", () => {
    expect(onboardingStepFor({ username: "alex", onboardingComplete: true })).toBeNull();
  });
});

describe("reading the flag from the token", () => {
  it("is true only for a literal true", () => {
    expect(onboardingCompleteIn({ onboarding_complete: true })).toBe(true);
    expect(onboardingCompleteIn({ onboarding_complete: "true" })).toBe(false);
    expect(onboardingCompleteIn({})).toBe(false);
    expect(onboardingCompleteIn(undefined)).toBe(false);
  });
});

describe("typing a handle", () => {
  it("drops spaces and lowers the case", () => {
    expect(handleInput(" Alex B ")).toBe("alexb");
    expect(handleInput("cyber-Learn")).toBe("cyber-learn");
  });
});
