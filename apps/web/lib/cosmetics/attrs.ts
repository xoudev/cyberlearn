import type { EquippedCodes } from "@cyberlearn/db";

/** data-* attributes the app shell puts on its wrapper to drive cosmetic CSS. */
export interface CosmeticAttrs {
  "data-accent"?: string;
  "data-hex"?: string;
  "data-frame"?: string;
  "data-terminal"?: string;
}

/**
 * Builds the data-* attributes from the user's equipped loadout. A null slot is
 * omitted, so the CSS falls back to the platform default for that slot.
 */
export function cosmeticAttrs(loadout: EquippedCodes | null): CosmeticAttrs {
  if (!loadout) return {};
  const attrs: CosmeticAttrs = {};
  if (loadout.accentColor) attrs["data-accent"] = loadout.accentColor;
  if (loadout.hexagonStyle) attrs["data-hex"] = loadout.hexagonStyle;
  if (loadout.profileFrame) attrs["data-frame"] = loadout.profileFrame;
  if (loadout.terminalTheme) attrs["data-terminal"] = loadout.terminalTheme;
  return attrs;
}
