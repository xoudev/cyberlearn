import type { CosmeticType } from "@cyberlearn/db";

/** The UserCosmeticLoadout column that stores each cosmetic type's equipped code. */
export const COSMETIC_SLOT_BY_TYPE = {
  TERMINAL_THEME: "terminalTheme",
  HEXAGON_STYLE: "hexagonStyle",
  PROFILE_FRAME: "profileFrame",
  ACCENT_COLOR: "accentColor",
} as const;

/** A single-slot patch for UserCosmeticLoadout (code to equip, or null to clear). */
export type LoadoutPatch =
  | { terminalTheme: string | null }
  | { hexagonStyle: string | null }
  | { profileFrame: string | null }
  | { accentColor: string | null };

/** Build the loadout patch for one cosmetic type. Exhaustive over CosmeticType. */
export function loadoutPatchFor(type: CosmeticType, code: string | null): LoadoutPatch {
  switch (type) {
    case "TERMINAL_THEME":
      return { terminalTheme: code };
    case "HEXAGON_STYLE":
      return { hexagonStyle: code };
    case "PROFILE_FRAME":
      return { profileFrame: code };
    case "ACCENT_COLOR":
      return { accentColor: code };
  }
}
