/** XP required to advance from level `n` to level `n + 1`. */
export function xpForNextLevel(level: number): number {
  return level * 100;
}

/** Cumulative XP required to reach level `n` from level 1. */
function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * (level - 1);
}

/**
 * Derives the player's current level and progress within that level
 * from their total accumulated XP.
 *
 * Formula: advancing from level N to N+1 requires N×100 XP.
 * Cumulative XP to reach level N = 50 × N × (N−1).
 */
export function computeLevel(xpTotal: number): {
  level: number;
  current: number;
  needed: number;
} {
  let level = 1;
  while (level < 100 && xpTotal >= cumulativeXpForLevel(level + 1)) {
    level++;
  }
  const base = cumulativeXpForLevel(level);
  const cap = level < 100 ? cumulativeXpForLevel(level + 1) : base + 9999;
  return {
    level,
    current: xpTotal - base,
    needed: cap - base,
  };
}
