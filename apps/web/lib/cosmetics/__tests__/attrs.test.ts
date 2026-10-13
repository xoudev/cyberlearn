import { describe, expect, it } from "vitest";
import { cosmeticAttrs, scopedCosmeticAttrs } from "../attrs";

describe("cosmeticAttrs", () => {
  it("returns no attributes when there is no loadout", () => {
    expect(cosmeticAttrs(null)).toEqual({});
  });

  it("maps each equipped slot to its data-* attribute", () => {
    expect(
      cosmeticAttrs({
        accentColor: "accent-amber",
        hexagonStyle: "hex-neon",
        profileFrame: "frame-gilded",
        terminalTheme: "theme-acid",
      }),
    ).toEqual({
      "data-accent": "accent-amber",
      "data-hex": "hex-neon",
      "data-frame": "frame-gilded",
      "data-terminal": "theme-acid",
    });
  });

  it("omits null slots so the default applies", () => {
    expect(
      cosmeticAttrs({
        accentColor: "accent-violet",
        hexagonStyle: null,
        profileFrame: null,
        terminalTheme: null,
      }),
    ).toEqual({ "data-accent": "accent-violet" });
  });
});

describe("scopedCosmeticAttrs", () => {
  it("states every slot, an empty one as its default, so nothing leaks in from around it", () => {
    expect(scopedCosmeticAttrs(null)).toEqual({
      "data-accent": "accent-turquoise",
      "data-hex": "hex-solid",
      "data-frame": "frame-standard",
      "data-terminal": "theme-midnight-ops",
    });
  });

  it("keeps what the owner equipped", () => {
    expect(
      scopedCosmeticAttrs({
        accentColor: "accent-violet",
        hexagonStyle: null,
        profileFrame: "frame-gilded",
        terminalTheme: null,
      }),
    ).toEqual({
      "data-accent": "accent-violet",
      "data-hex": "hex-solid",
      "data-frame": "frame-gilded",
      "data-terminal": "theme-midnight-ops",
    });
  });
});
