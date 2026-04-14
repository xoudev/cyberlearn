interface XPBarProps {
  /** Current XP within the level (0 to xpForNextLevel) */
  currentXP: number;
  /** XP required to reach the next level */
  xpForNextLevel: number;
  /** Current level number (1–100) */
  level: number;
  /** Show numeric XP values below the bar */
  showValues?: boolean;
  className?: string;
}
/**
 * Displays a user's XP progress toward the next level.
 * The filled portion uses the brand turquoise gradient.
 */
export declare function XPBar({
  currentXP,
  xpForNextLevel,
  level,
  showValues,
  className,
}: XPBarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=xp-bar.d.ts.map
