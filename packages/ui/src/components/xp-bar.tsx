"use client";

import { cn } from "../lib/utils.js";

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
export function XPBar({
  currentXP,
  xpForNextLevel,
  level,
  showValues = false,
  className,
}: XPBarProps) {
  const percent = xpForNextLevel > 0 ? Math.min((currentXP / xpForNextLevel) * 100, 100) : 0;

  return (
    <div className={cn("w-full space-y-1", className)}>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-border-default)" }}
        role="progressbar"
        aria-valuenow={currentXP}
        aria-valuemin={0}
        aria-valuemax={xpForNextLevel}
        aria-label={`Niveau ${level} — ${currentXP} / ${xpForNextLevel} XP`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${percent}%`,
            background:
              "linear-gradient(90deg, var(--color-brand-blue), var(--color-brand-turquoise))",
          }}
        />
      </div>
      {showValues && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {currentXP.toLocaleString("fr-FR")} / {xpForNextLevel.toLocaleString("fr-FR")} XP
        </p>
      )}
    </div>
  );
}
