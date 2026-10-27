import React from "react";
import { formatNumberFr } from "@cyberlearn/lib";
import { ProgressBar } from "@/components/progress-bar";

/** The level uses a square marker and a labelled XP bar, matching the site's geometry. */
export function LevelRing({
  level,
  rankName,
  xpCurrent,
  xpNeeded,
  xpPercent,
  xpNeededToNext,
  userRank,
}: {
  level: number;
  rankName: string;
  xpCurrent: number;
  xpNeeded: number;
  xpPercent: number;
  xpNeededToNext: number;
  userRank: number;
}): React.JSX.Element {
  return (
    <div
      className="learning-level"
      role="group"
      aria-label={`Niveau ${String(level)}, ${String(Math.round(xpPercent))} % vers le niveau ${String(level + 1)}`}
    >
      <div className="learning-level-mark">
        <span>Niveau</span>
        <b>{level}</b>
      </div>
      <div className="learning-level-body">
        <div>
          <strong>{rankName}</strong>
          <span>
            {formatNumberFr(xpCurrent)} / {formatNumberFr(xpNeeded)} XP
          </span>
        </div>
        <ProgressBar
          value={xpCurrent}
          max={xpNeeded}
          label="Progression vers le prochain niveau"
          color="var(--cosmetic-accent)"
          size="xs"
        />
        <p>
          Encore {formatNumberFr(xpNeededToNext)} XP
          {userRank > 0 ? ` · Rang #${formatNumberFr(userRank)}` : " · Hors classement"}
        </p>
      </div>
    </div>
  );
}
