import { describe, expect, it } from "vitest";
import {
  GLYPH_PREFIX,
  avatarInitials,
  avatarSourceOf,
  glyphNameOf,
  glyphPath,
  isRenderableAvatarSrc,
} from "./display";

describe("what a stored avatar value is", () => {
  it("reads an uploaded photo's storage key", () => {
    expect(avatarSourceOf("__upload:user-1/photo.webp")).toEqual({
      kind: "upload",
      key: "user-1/photo.webp",
    });
  });

  it("reads a glyph", () => {
    expect(avatarSourceOf(`${GLYPH_PREFIX}skull`)).toEqual({ kind: "glyph", name: "skull" });
  });

  it("knows the site's eight built-in pictures", () => {
    expect(avatarSourceOf("/avatars/av-3.svg")).toEqual({
      kind: "builtin",
      path: "/avatars/av-3.svg",
    });
  });

  it("keeps a linked identity's picture", () => {
    expect(avatarSourceOf("https://avatars.githubusercontent.com/u/1?v=4")).toEqual({
      kind: "remote",
      url: "https://avatars.githubusercontent.com/u/1?v=4",
    });
  });

  it("draws the initials for nothing, and for anything it does not know", () => {
    // An empty marker, a path the site does not serve, plain http and a
    // script URL: none of them goes into an <img src>.
    for (const value of [
      null,
      undefined,
      "",
      "__upload:",
      "/avatars/av-99.svg",
      "http://example.com/a.png",
      "javascript:alert(1)",
    ]) {
      expect(avatarSourceOf(value)).toEqual({ kind: "none" });
    }
  });
});

describe("glyphs", () => {
  it("draws every glyph the site's picker offers", () => {
    for (const name of ["skull", "ghost", "matrix", "circuit", "bug", "key", "shield", "wire"]) {
      expect(glyphPath(name)).not.toBeNull();
    }
  });

  it("draws nothing for a name it does not know", () => {
    expect(glyphPath("unicorn")).toBeNull();
    expect(glyphNameOf("/avatars/av-1.svg")).toBeNull();
  });
});

describe("what may go into an img src", () => {
  it("passes a signed URL and an absolute built-in picture", () => {
    expect(isRenderableAvatarSrc("https://x.supabase.co/storage/v1/object/sign/a?token=b")).toBe(
      true,
    );
    expect(isRenderableAvatarSrc("http://localhost:3000/avatars/av-1.svg")).toBe(true);
  });

  it("refuses the markers and nothing", () => {
    expect(isRenderableAvatarSrc(`${GLYPH_PREFIX}skull`)).toBe(false);
    expect(isRenderableAvatarSrc("__upload:abc/def.png")).toBe(false);
    expect(isRenderableAvatarSrc(null)).toBe(false);
    expect(isRenderableAvatarSrc("")).toBe(false);
  });
});

describe("initials", () => {
  it("takes one letter from each of two words", () => {
    expect(avatarInitials("Amélie Durand")).toBe("AD");
    expect(avatarInitials("jean-marc")).toBe("JM");
  });

  it("takes two letters from a handle, without its @", () => {
    expect(avatarInitials("@admin")).toBe("AD");
  });

  it("is never empty", () => {
    expect(avatarInitials("")).toBe("?");
    expect(avatarInitials("   ")).toBe("?");
  });

  it("keeps an emoji whole", () => {
    expect(avatarInitials("🦊 Renard")).toBe("🦊R");
  });
});
