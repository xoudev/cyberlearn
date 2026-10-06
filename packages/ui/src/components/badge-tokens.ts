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

/** The ring a rarity earns: the profile's avatar frame, a medallion's rim. */
export const BADGE_RARITY_GRADIENT: Record<BadgeRarity, string> = {
  LEGENDARY:
    "linear-gradient(135deg, var(--color-rarity-legendary) 0%, var(--color-category-cybersec) 50%, var(--color-brand-blue) 100%)",
  EPIC: "linear-gradient(135deg, var(--cosmetic-accent) 0%, var(--color-brand-blue) 100%)",
  RARE: "linear-gradient(135deg, var(--color-rarity-rare) 0%, #4A3FCC 100%)",
  COMMON: "linear-gradient(135deg, var(--color-text-secondary) 0%, var(--color-text-muted) 100%)",
};

/** Narrow an arbitrary string (e.g. a serialized rarity) to a BadgeRarity. */
export function toBadgeRarity(value: string): BadgeRarity {
  return value === "RARE" || value === "EPIC" || value === "LEGENDARY" ? value : "COMMON";
}

/** The rarest of what somebody has earned; common when nothing. */
export function rarestOf(rarities: readonly string[]): BadgeRarity {
  return BADGE_RARITY_ORDER.find((rarity) => rarities.includes(rarity)) ?? "COMMON";
}
