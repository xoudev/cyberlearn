import { describe, expect, it } from "vitest";
import { GLYPH_PREFIX, glyphNameOf, glyphPath, initialsOf, isRenderableSrc } from "../glyphs";

/**
 * Reading the stored avatar value, which is the thing eleven screens each did
 * by hand and two got wrong.
 */

describe("what a stored value names", () => {
  it("reads the glyph out of a marker", () => {
    expect(glyphNameOf(`${GLYPH_PREFIX}skull`)).toBe("skull");
  });

  it("says nothing for a value that is not one", () => {
    // A built-in path, a signed URL and nothing at all: none of them is a glyph.
    expect(glyphNameOf("/avatars/hacker.png")).toBeNull();
    expect(glyphNameOf("https://x.supabase.co/object/sign/a?token=b")).toBeNull();
    expect(glyphNameOf(null)).toBeNull();
  });

  it("draws every glyph the picker offers", () => {
    for (const name of ["skull", "ghost", "matrix", "circuit", "bug", "key", "shield", "wire"]) {
      expect(glyphPath(name)).not.toBeNull();
    }
  });

  it("draws nothing for a name it does not know", () => {
    // Somebody's stored glyph outliving its removal from the picker. The
    // caller falls back to a circle rather than rendering an empty path.
    expect(glyphPath("unicorn")).toBeNull();
  });
});

describe("what may go into an img src", () => {
  it("passes a signed URL and a built-in path", () => {
    expect(isRenderableSrc("https://x.supabase.co/object/sign/a?token=b")).toBe(true);
    expect(isRenderableSrc("/avatars/hacker.png")).toBe(true);
  });

  it("refuses a glyph marker", () => {
    // The forum's defect exactly: this went into an <img src> and rendered as
    // a broken image.
    expect(isRenderableSrc(`${GLYPH_PREFIX}skull`)).toBe(false);
  });

  it("refuses an upload marker nobody resolved", () => {
    // Belt and braces: the caller is meant to have signed it, and if they did
    // not, initials beat a request for /__upload:abc/def.png.
    expect(isRenderableSrc("__upload:abc/def.png")).toBe(false);
  });

  it("refuses nothing and the empty string", () => {
    expect(isRenderableSrc(null)).toBe(false);
    expect(isRenderableSrc("")).toBe(false);
  });
});

describe("initials, for somebody with no picture", () => {
  it("takes one letter from each of two words", () => {
    expect(initialsOf("Amélie Durand")).toBe("AD");
  });

  it("splits on the separators a handle uses", () => {
    expect(initialsOf("amelie_durand")).toBe("AD");
    expect(initialsOf("amelie-durand")).toBe("AD");
    expect(initialsOf("amelie.durand")).toBe("AD");
  });

  it("takes two letters from a single word", () => {
    expect(initialsOf("Sacha")).toBe("SA");
  });

  it("gives something back for a name that is only spaces", () => {
    // A blank circle says less than a question mark, and every list has one
    // row whose name has been anonymised away.
    expect(initialsOf("   ")).toBe("?");
  });
});
