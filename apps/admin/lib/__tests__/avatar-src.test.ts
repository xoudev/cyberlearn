import { describe, expect, it } from "vitest";
import { avatarDisplaySrc, badgeIconSrc, originOf } from "../avatar-src";

const context = {
  siteOrigin: "https://cyberlearn.fr",
  signedUrlOf: (key: string): string | null =>
    key === "user-1/photo.webp" ? "https://x.supabase.co/storage/v1/object/sign/avatars/a" : null,
};

/**
 * The console showed initials for everybody: the stored value is a marker or
 * a path on the learner site, and none of them renders from the console as is.
 */
describe("the src the console draws an avatar from", () => {
  it("shows an uploaded photo through its signed URL", () => {
    expect(avatarDisplaySrc("__upload:user-1/photo.webp", context)).toBe(
      "https://x.supabase.co/storage/v1/object/sign/avatars/a",
    );
  });

  it("falls back to the initials when the photo could not be signed", () => {
    expect(avatarDisplaySrc("__upload:user-2/gone.png", context)).toBeNull();
  });

  it("fetches a built-in picture from the learner site, which serves it", () => {
    expect(avatarDisplaySrc("/avatars/av-4.svg", context)).toBe(
      "https://cyberlearn.fr/avatars/av-4.svg",
    );
  });

  it("keeps a glyph as a marker for the component to draw", () => {
    expect(avatarDisplaySrc("__glyph:shield", context)).toBe("__glyph:shield");
  });

  it("keeps a linked identity's picture", () => {
    expect(avatarDisplaySrc("https://avatars.githubusercontent.com/u/1?v=4", context)).toBe(
      "https://avatars.githubusercontent.com/u/1?v=4",
    );
  });

  it("draws the initials for nothing and for an unknown value", () => {
    expect(avatarDisplaySrc(null, context)).toBeNull();
    expect(avatarDisplaySrc("/etc/passwd", context)).toBeNull();
    expect(avatarDisplaySrc("javascript:alert(1)", context)).toBeNull();
  });
});

describe("originOf", () => {
  it("reads the origin of a configured URL", () => {
    expect(originOf("http://localhost:3000/some/path")).toBe("http://localhost:3000");
  });

  it("says nothing for a value that is not a URL", () => {
    expect(originOf(undefined)).toBeNull();
    expect(originOf("")).toBeNull();
    expect(originOf("not a url")).toBeNull();
  });
});

describe("the src the console draws a badge icon from", () => {
  it("reads an icon of the learner site from its origin", () => {
    expect(badgeIconSrc("/badges/legend.svg", "https://cyberlearn.fr")).toBe(
      "https://cyberlearn.fr/badges/legend.svg",
    );
  });

  it("keeps an https icon as it is", () => {
    expect(badgeIconSrc("https://cdn.example.org/b.svg", "https://cyberlearn.fr")).toBe(
      "https://cdn.example.org/b.svg",
    );
  });

  it("draws nothing for any other form", () => {
    expect(badgeIconSrc("//evil.example/b.svg", "https://cyberlearn.fr")).toBeNull();
    expect(badgeIconSrc("javascript:alert(1)", "https://cyberlearn.fr")).toBeNull();
    expect(badgeIconSrc("http://plain.example/b.svg", "https://cyberlearn.fr")).toBeNull();
  });
});
