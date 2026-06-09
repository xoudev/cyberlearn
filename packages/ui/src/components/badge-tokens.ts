// Plain (non-"use client") module so BOTH server and client components can
// import these badge-rarity tokens. Colours themselves live in tokens.css
// (--color-rarity-*); this maps each rarity to its CSS custom property so every
// surface reads ONE centralised scale instead of re-declaring hex literals.

import type { BadgeRarity } from "./rarity-badge.js";

/** Rarity → CSS custom property. Single source of truth for badge colours. */
export const BADGE_RARITY_VAR: Record<BadgeRarity, string> = {
  COMMON: "var(--color-rarity-common)",
  RARE: "var(--color-rarity-rare)",
  EPIC: "var(--color-rarity-epic)",
  LEGENDARY: "var(--color-rarity-legendary)",
};

/** Narrow an arbitrary string (e.g. a serialized rarity) to a BadgeRarity. */
export function toBadgeRarity(value: string): BadgeRarity {
  return value === "RARE" || value === "EPIC" || value === "LEGENDARY" ? value : "COMMON";
}
