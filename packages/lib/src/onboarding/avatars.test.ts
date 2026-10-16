import { describe, expect, it } from "vitest";
import {
  DEFAULT_ONBOARDING_AVATAR,
  KEEP_CURRENT_AVATAR,
  ONBOARDING_AVATARS,
  ONBOARDING_AVATAR_CHOICES,
  identityPhoto,
  initialOnboardingChoice,
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

describe("the photo the avatar step offers to keep", () => {
  it("is the identity's picture, an address of its own", () => {
    const github = "https://avatars.githubusercontent.com/u/1?v=4";
    expect(identityPhoto(github)).toBe(github);
  });

  it("is nothing for one of the eight, a glyph, an uploaded file or no avatar", () => {
    expect(identityPhoto("/avatars/av-8.svg")).toBeNull();
    expect(identityPhoto("__glyph:skull")).toBeNull();
    expect(identityPhoto("__upload:me.png")).toBeNull();
    expect(identityPhoto(null)).toBeNull();
  });

  it("is kept by a value that is none of the eight", () => {
    expect(isOnboardingAvatar(KEEP_CURRENT_AVATAR)).toBe(false);
  });
});

describe("what the avatar step starts on", () => {
  it("is the one of the eight in use", () => {
    expect(initialOnboardingChoice("/avatars/av-3.svg")).toBe("/avatars/av-3.svg");
  });

  it("is the photo to keep, rather than CL over it", () => {
    expect(initialOnboardingChoice("https://avatars.githubusercontent.com/u/1?v=4")).toBe(
      KEEP_CURRENT_AVATAR,
    );
  });

  it("is CL when there is nothing to keep", () => {
    expect(initialOnboardingChoice(null)).toBe(DEFAULT_ONBOARDING_AVATAR);
    expect(initialOnboardingChoice("__glyph:skull")).toBe(DEFAULT_ONBOARDING_AVATAR);
  });
});
