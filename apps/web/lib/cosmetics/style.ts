import type { CSSProperties } from "react";

/**
 * Shared read-side styling for equipped cosmetics. Every value comes from the
 * var(--cosmetic-*) custom properties that CosmeticsProvider applies app-wide,
 * so any surface using these helpers re-styles instantly when the user equips a
 * cosmetic (no reload).
 */

/**
 * Layered aura for hexagon avatars: the equipped hexagon-style glow (accent
 * colour) stacked with the equipped profile-frame glow (frame colour). Both
 * intensities are driven by the loadout, so equipping a hexagon or a frame
 * changes the avatar live. `scale` tunes the blur radius to the avatar size
 * (1 = large profile avatar, ~0.5 = small navbar avatar).
 */
export function cosmeticAvatarFilter(scale = 1): CSSProperties {
  const hex = `drop-shadow(0 0 calc(var(--cosmetic-hex-glow) * ${String(34 * scale)}px) color-mix(in srgb, var(--cosmetic-hex-accent, var(--cosmetic-accent)) 70%, transparent))`;
  const frame = `drop-shadow(0 0 calc(var(--cosmetic-frame-glow) * ${String(26 * scale)}px) color-mix(in srgb, var(--cosmetic-frame-accent) 80%, transparent))`;
  return { filter: `${hex} ${frame}` };
}
