import React from "react";
import { formatNumberFr } from "@cyberlearn/lib";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The level, drawn as a ring filling towards the next one, with the rank it
 * earns and the standing on the leaderboard beside it.
 *
 * One number and one word, as the panel it replaces had settled on; the bar
 * became a ring because a ring says "level" on its own, where a bar under a
 * number had to be labelled twice.
 */
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
  const clamped = Math.min(100, Math.max(0, xpPercent));
  const filled = (clamped / 100) * CIRCUMFERENCE;

  return (
    <div
      className="dash-lvl"
      role="group"
      aria-label={`Niveau ${String(level)}, ${String(Math.round(clamped))} % vers le niveau ${String(level + 1)}`}
    >
      <div className="dash-ring" aria-hidden="true">
        <svg viewBox="0 0 96 96">
          <defs>
            <linearGradient id="dash-ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0024FF" />
              <stop offset="1" style={{ stopColor: "var(--cosmetic-accent)" }} />
            </linearGradient>
          </defs>
          <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="#1F1B47" strokeWidth="6" />
          <circle
            cx="48"
            cy="48"
            r={RADIUS}
            fill="none"
            stroke="url(#dash-ring-gradient)"
            strokeWidth="6"
            strokeDasharray={`${filled.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
            transform="rotate(-90 48 48)"
          />
        </svg>
        <span className="dash-ring-n">{level}</span>
      </div>
      <div className="dash-lvl-text">
        <b>{rankName}</b>
        <span className="dash-lvl-xp">
          {formatNumberFr(xpCurrent)} / {formatNumberFr(xpNeeded)} XP
        </span>
        <span className="dash-lvl-next">
          Encore <b>{formatNumberFr(xpNeededToNext)} XP</b> avant le niveau {level + 1}
        </span>
        <span className="dash-lvl-rank">
          {/* 0 is findUserRank's "not ranked": the leaderboard counts students
              only, so a teacher or an admin would otherwise read "Rang #0". */}
          {userRank > 0 ? (
            <>
              Rang <b>#{formatNumberFr(userRank)}</b> au classement
            </>
          ) : (
            <span title="Le classement compte les apprenants à partir de leur premier XP.">
              Hors classement
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
