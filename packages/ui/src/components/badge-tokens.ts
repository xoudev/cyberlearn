// Plain (non-"use client") module so BOTH server and client components can
// import these badge-rarity tokens. Colours themselves live in tokens.css
// (--color-rarity-*); this maps each rarity to its CSS custom property so every
// surface reads ONE centralised scale instead of re-declaring hex literals.

/** Badge rarities must match the BadgeRarity enum in Prisma */
export type BadgeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

/** Rarest first: the order the collections sort by and the profile picks its ring from. */
export const BADGE_RARITY_ORDER: readonly BadgeRarity[] = ["LEGENDARY", "EPIC", "RARE", "COMMON"];

/** French rarity labels (UPPERCASE-rendered at call sites). Single source of truth. */
export const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  COMMON: "Commun",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
};

/** Rarity → CSS custom property. Single source of truth for badge colours. */
export const BADGE_RARITY_VAR: Record<BadgeRarity, string> = {
  COMMON: "var(--color-rarity-common)",
  RARE: "var(--color-rarity-rare)",
  EPIC: "var(--color-rarity-epic)",
  LEGENDARY: "var(--color-rarity-legendary)",
};

/**
 * The ring a rarity earns: the profile's avatar frame, a medallion's rim.
 * Flat, the Bastion way: one rarity, one colour, written as a gradient so the
 * callers that paint it as a background-image keep working.
 */
export const BADGE_RARITY_GRADIENT: Record<BadgeRarity, string> = {
  LEGENDARY: "linear-gradient(var(--color-rarity-legendary), var(--color-rarity-legendary))",
  EPIC: "linear-gradient(var(--color-rarity-epic), var(--color-rarity-epic))",
  RARE: "linear-gradient(var(--color-rarity-rare), var(--color-rarity-rare))",
  COMMON: "linear-gradient(var(--color-rarity-common), var(--color-rarity-common))",
};

/** Narrow an arbitrary string (e.g. a serialized rarity) to a BadgeRarity. */
export function toBadgeRarity(value: string): BadgeRarity {
  return value === "RARE" || value === "EPIC" || value === "LEGENDARY" ? value : "COMMON";
}

/** The rarest of what somebody has earned; common when nothing. */
export function rarestOf(rarities: readonly string[]): BadgeRarity {
  return BADGE_RARITY_ORDER.find((rarity) => rarities.includes(rarity)) ?? "COMMON";
}
