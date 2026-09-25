import { describe, expect, it } from "vitest";
import {
  DEFAULT_ONBOARDING_AVATAR,
  ONBOARDING_AVATARS,
  ONBOARDING_AVATAR_CHOICES,
  isOnboardingAvatar,
} from "./avatars.js";

describe("the sign-up avatars", () => {
  it("lists the eight built-in avatars once each, in order", () => {
    expect(ONBOARDING_AVATARS).toEqual(ONBOARDING_AVATAR_CHOICES.map((c) => c.path));
    expect(new Set(ONBOARDING_AVATARS).size).toBe(8);
    expect(ONBOARDING_AVATARS).toContain(DEFAULT_ONBOARDING_AVATAR);
  });

  it("recognises one of them, and nothing else", () => {
    expect(isOnboardingAvatar("/avatars/av-3.svg")).toBe(true);
    expect(isOnboardingAvatar("__upload:me.png")).toBe(false);
    expect(isOnboardingAvatar(null)).toBe(false);
  });
});
