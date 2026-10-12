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

/** The code each slot shows when nothing is equipped: the defaults tokens.css states. */
const DEFAULT_ATTRS: Required<CosmeticAttrs> = {
  "data-accent": "accent-turquoise",
  "data-hex": "hex-solid",
  "data-frame": "frame-standard",
  "data-terminal": "theme-midnight-ops",
};

/**
 * Somebody else's cosmetics, for a scope nested inside the reader's own: a
 * profile wears its owner's look inside the shell that wears the reader's.
 *
 * Every slot is set. An empty one left out would inherit from the scope
 * around it, so a profile whose owner equipped nothing would show the
 * reader's accent as if it were theirs.
 */
export function scopedCosmeticAttrs(loadout: EquippedCodes | null): Required<CosmeticAttrs> {
  return { ...DEFAULT_ATTRS, ...cosmeticAttrs(loadout) };
}
