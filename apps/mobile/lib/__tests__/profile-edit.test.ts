import { describe, expect, it } from "vitest";
import { PROFILE_AVATARS, initialAvatarChoice, profileEditBody } from "../profile-edit";

describe("the avatar picker", () => {
  it("starts on the built-in avatar in use", () => {
    expect(initialAvatarChoice("/avatars/av-4.svg")).toBe("/avatars/av-4.svg");
  });

  it("keeps a photo, a glyph or nothing as they are", () => {
    expect(initialAvatarChoice("__upload:me.png")).toBe("current");
    expect(initialAvatarChoice("__glyph:skull")).toBe("current");
    expect(initialAvatarChoice(null)).toBe("current");
  });

  it("offers the site's eight", () => {
    expect(PROFILE_AVATARS).toHaveLength(8);
  });
});

describe("what saving sends", () => {
  it("sends a picked built-in avatar", () => {
    expect(
      profileEditBody({ displayName: " Alex ", bio: "", avatar: "/avatars/av-1.svg" }),
    ).toEqual({ displayName: "Alex", bio: "", avatarUrl: "/avatars/av-1.svg" });
  });

  it("leaves the avatar out when the current one is kept", () => {
    expect(profileEditBody({ displayName: "Alex", bio: " Réseaux ", avatar: "current" })).toEqual({
      displayName: "Alex",
      bio: "Réseaux",
    });
  });
});
