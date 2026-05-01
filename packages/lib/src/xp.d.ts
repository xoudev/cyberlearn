/** XP required to advance from level `n` to level `n + 1`. */
export declare function xpForNextLevel(level: number): number;
/**
 * Derives the player's current level and progress within that level
 * from their total accumulated XP.
 *
 * Formula: advancing from level N to N+1 requires N×100 XP.
 * Cumulative XP to reach level N = 50 × N × (N−1).
 */
export declare function computeLevel(xpTotal: number): {
  level: number;
  current: number;
  needed: number;
};
//# sourceMappingURL=xp.d.ts.map
