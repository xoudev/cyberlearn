// Permanent prestige tier ("palier"), derived purely from the player's level.
// Unlike the seasonal league division, a tier never decreases: the level only
// ever grows, so the tier is a monotonic, derivable status (no table needed).

export type TierCode = "BRONZE" | "ARGENT" | "OR" | "PLATINE" | "DIAMANT" | "ELITE";

export interface Tier {
  code: TierCode;
  label: string;
  /** Minimum level required to hold this tier. */
  minLevel: number;
  /** Accent color for the tier badge. */
  color: string;
}

const BRONZE: Tier = { code: "BRONZE", label: "Bronze", minLevel: 1, color: "#C77B3A" };

/** Ordered low → high. Level thresholds match the design (Bronze → Élite). */
export const TIERS: readonly Tier[] = [
  BRONZE,
  { code: "ARGENT", label: "Argent", minLevel: 5, color: "#AEB7C7" },
  { code: "OR", label: "Or", minLevel: 10, color: "#FFB547" },
  { code: "PLATINE", label: "Platine", minLevel: 15, color: "#7FE3E0" },
  { code: "DIAMANT", label: "Diamant", minLevel: 22, color: "#0AFFD4" },
  { code: "ELITE", label: "Élite", minLevel: 30, color: "#B14DFF" },
];

export interface TierStatus {
  tier: Tier;
  /** Index in TIERS (0 = Bronze). */
  index: number;
  /** The next tier up, or null when already at the top. */
  next: Tier | null;
  /** Levels remaining to reach `next`, or null at the top. */
  levelsToNext: number | null;
}

/**
 * Resolves the permanent tier for a level: the highest tier whose `minLevel`
 * is at or below `level`. Levels below the first threshold clamp to Bronze.
 */
export function computeTier(level: number): TierStatus {
  let index = 0;
  let tier: Tier = BRONZE;
  for (let i = 0; i < TIERS.length; i++) {
    const candidate = TIERS[i];
    if (candidate !== undefined && level >= candidate.minLevel) {
      tier = candidate;
      index = i;
    }
  }
  const next = TIERS[index + 1] ?? null;
  return {
    tier,
    index,
    next,
    levelsToNext: next === null ? null : Math.max(0, next.minLevel - level),
  };
}
