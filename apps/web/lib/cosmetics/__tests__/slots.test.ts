import { describe, expect, it } from "vitest";
import { COSMETIC_SLOT_BY_TYPE, loadoutPatchFor } from "../slots";

describe("loadoutPatchFor", () => {
  it("maps each cosmetic type to its loadout slot column", () => {
    expect(loadoutPatchFor("TERMINAL_THEME", "theme-x")).toEqual({ terminalTheme: "theme-x" });
    expect(loadoutPatchFor("HEXAGON_STYLE", "hex-x")).toEqual({ hexagonStyle: "hex-x" });
    expect(loadoutPatchFor("PROFILE_FRAME", "frame-x")).toEqual({ profileFrame: "frame-x" });
    expect(loadoutPatchFor("ACCENT_COLOR", "accent-x")).toEqual({ accentColor: "accent-x" });
  });

  it("passes null through (unequip clears the slot)", () => {
    expect(loadoutPatchFor("ACCENT_COLOR", null)).toEqual({ accentColor: null });
  });

  it("exposes the slot-column map", () => {
    expect(COSMETIC_SLOT_BY_TYPE).toEqual({
      TERMINAL_THEME: "terminalTheme",
      HEXAGON_STYLE: "hexagonStyle",
      PROFILE_FRAME: "profileFrame",
      ACCENT_COLOR: "accentColor",
    });
  });
});
