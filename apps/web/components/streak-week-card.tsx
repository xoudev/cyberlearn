import React from "react";
import Link from "next/link";
import { dayKey } from "@cyberlearn/lib";
import { streakRepository } from "@cyberlearn/db";
import { streakWeek } from "@cyberlearn/lib/gamification/streak-week";

/**
 * The streak, this week: the count, the record, Monday to Sunday with the
 * active days lit, and the freezes in reserve. The year's calendar and the
 * milestones stay on the profile (StreakPanel), which the heading links to.
 * Server component - reads streakRepository.getOverview.
 */
export async function StreakWeekCard({
  userId,
}: {
  userId: string;
}): Promise<React.ReactElement | null> {
  const overview = await streakRepository.getOverview(userId);
  if (!overview) return null;

  const days = streakWeek(overview.activity, dayKey(new Date()));
  const streak = overview.currentStreak;

  return (
    <div className="dash-card dash-card--streak">
      <div className="dash-card-head">
        <h3>Série</h3>
        <span>
          {overview.longestStreak > 0 ? (
            <>
              record {overview.longestStreak} jour{overview.longestStreak > 1 ? "s" : ""}
            </>
          ) : (
            <Link href="/profile">Voir l&apos;année</Link>
          )}
        </span>
      </div>
      <div className="dash-streak-top">
        <b className={overview.active ? "" : "dash-streak-top--off"}>{streak}</b>
        <span>
          {streak === 1 ? "jour d'affilée" : "jours d'affilée"}
          {!overview.active && " · une leçon aujourd'hui la relance"}
        </span>
      </div>
      <div className="dash-days" role="img" aria-label={weekLabel(days)}>
        {days.map((day) => (
          <div
            key={day.key}
            className={`dash-day${day.active ? " dash-day--on" : ""}${day.today ? " dash-day--today" : ""}${day.future ? " dash-day--future" : ""}`}
          >
            <i aria-hidden="true" />
            <span aria-hidden="true">{day.label}</span>
          </div>
        ))}
      </div>
      <p className="dash-freeze">
        {overview.freezes > 0 ? (
          <>
            <b>
              {overview.freezes} gel{overview.freezes > 1 ? "s" : ""}
            </b>{" "}
            en réserve : un jour manqué ne casse pas la série.
          </>
        ) : (
          <>Pas de gel en réserve : le bonus des quêtes de la semaine en donne un.</>
        )}
      </p>
    </div>
  );
}

/** "Cette semaine : lundi et mercredi actifs" for the row, read aloud. */
function weekLabel(days: ReturnType<typeof streakWeek>): string {
  const names = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const active = days.flatMap((day, i) => (day.active ? [names[i] ?? ""] : []));
  if (active.length === 0) return "Cette semaine : aucun jour actif pour l'instant";
  return `Cette semaine : ${active.join(", ")} actif${active.length > 1 ? "s" : ""}`;
}
