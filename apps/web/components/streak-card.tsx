import React from "react";
import Link from "next/link";
import { dayKey, nextMilestone } from "@cyberlearn/lib";
import { streakRepository, type StreakOverview } from "@cyberlearn/db";
import {
  STREAK_COPY,
  streakCalendar,
  WEEKDAY_LABELS,
} from "@cyberlearn/lib/gamification/streak-calendar";
import { streakWeek } from "@cyberlearn/lib/gamification/streak-week";

/**
 * The streak, one card for the dashboard and the profile.
 *
 * The count, the record, Monday to Sunday with the active days lit, and the
 * freezes in reserve. With `year`, the profile's version goes on below the
 * same card: the days this year, the next milestone, and the last twelve
 * months as a calendar.
 *
 * The dashboard and the profile used to draw the streak with two components
 * that agreed on nothing: not the icon, not the colours, not the words for a
 * broken streak. Server component, reads streakRepository.getOverview.
 */
export async function StreakCard({
  userId,
  year = false,
}: {
  userId: string;
  /** The profile's version: the year's figures and its calendar under the week. */
  year?: boolean;
}): Promise<React.ReactElement | null> {
  const overview = await streakRepository.getOverview(userId);
  if (!overview) return null;

  const today = dayKey(new Date());
  const days = streakWeek(overview.activity, today);
  const streak = overview.currentStreak;

  return (
    <div className="dash-card dash-card--streak">
      <div className="dash-card-head">
        <h3>Série</h3>
        {overview.longestStreak > 0 ? (
          <span>
            record {overview.longestStreak} jour{overview.longestStreak > 1 ? "s" : ""}
          </span>
        ) : (
          !year && (
            <span>
              <Link href="/profile">Voir l&apos;année</Link>
            </span>
          )
        )}
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
      {year && <StreakYear overview={overview} today={today} />}
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

/**
 * The year under the week: two figures in the dashboard's own vocabulary, and
 * the calendar the app draws too (same grid, same levels, same words).
 */
function StreakYear({
  overview,
  today,
}: {
  overview: StreakOverview;
  today: string;
}): React.ReactElement {
  const { cells, monthLabels } = streakCalendar(overview.activity, today);
  const next = nextMilestone(overview.currentStreak);
  const toGo = next === null ? 0 : next - overview.currentStreak;

  return (
    <div className="dash-streak-year">
      <div className="dash-figs">
        <div className="dash-fig">
          <b>
            {overview.daysThisYear}
            <small>j</small>
          </b>
          <span>
            {STREAK_COPY.thisYear}
            <small>
              {overview.daysThisYear === 1 ? "jour actif" : "jours actifs"} depuis le 1er janvier
            </small>
          </span>
        </div>
        <div className="dash-fig">
          <b>
            {next === null ? (
              "max"
            ) : (
              <>
                {next}
                <small>j</small>
              </>
            )}
          </b>
          <span>
            {STREAK_COPY.nextMilestone}
            <small>
              {next === null
                ? "tous les paliers sont passés"
                : `encore ${String(toGo)} jour${toGo > 1 ? "s" : ""}`}
            </small>
          </span>
        </div>
      </div>

      <div className="dash-heat-head">
        <span>{STREAK_COPY.lastYear}</span>
        <span className="dash-heat-legend" aria-hidden="true">
          {STREAK_COPY.less}
          {[0, 1, 2, 3].map((level) => (
            <i key={level} className="dash-heat-cell" data-level={level} />
          ))}
          {STREAK_COPY.more}
        </span>
      </div>
      {/* A scrolling box takes keyboard focus; named, it announces what it
          holds instead of reading the month labels one by one. */}
      <div className="dash-heat" role="region" aria-label="Activité des douze derniers mois">
        <div className="dash-heat-months">
          <span className="dash-heat-gutter" aria-hidden="true" />
          <div aria-hidden="true">
            {monthLabels.map((month, w) => (
              <span key={`m${String(w)}`}>{month}</span>
            ))}
          </div>
        </div>
        <div className="dash-heat-body">
          <div className="dash-heat-days" aria-hidden="true">
            {WEEKDAY_LABELS.map((label, r) => (
              <span key={`d${String(r)}`}>{label}</span>
            ))}
          </div>
          <div className="dash-heat-grid">
            {cells.map((cell) =>
              cell.future ? (
                <i key={cell.key} className="dash-heat-cell dash-heat-cell--future" />
              ) : (
                <i
                  key={cell.key}
                  className="dash-heat-cell"
                  data-level={cell.level}
                  title={`${cell.key} · ${String(cell.count)}`}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
