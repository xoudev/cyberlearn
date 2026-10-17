import React from "react";
import {
  STREAK_COPY,
  streakCalendar,
  WEEKDAY_LABELS,
} from "@cyberlearn/lib/gamification/streak-calendar";

/**
 * A year of activity, day by day: the calendar the profile's streak card
 * ends on, and the one somebody's public profile shows. Same grid, same
 * levels, same words as the app's (streakCalendar), so the two read alike.
 * Server component; the styles are the dashboard's (.dash-heat-*, globals).
 */
export function ActivityHeatmap({
  activity,
  today,
  label = "Activité des douze derniers mois",
}: {
  /** Activity count by day, "YYYY-MM-DD". */
  activity: Record<string, number>;
  /** Today's "YYYY-MM-DD", where the calendar ends. */
  today: string;
  /** What the scrolling box announces instead of its month labels. */
  label?: string;
}): React.ReactElement {
  const { cells, monthLabels } = streakCalendar(activity, today);
  return (
    <>
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
      <div className="dash-heat" role="region" aria-label={label}>
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
            {WEEKDAY_LABELS.map((day, r) => (
              <span key={`d${String(r)}`}>{day}</span>
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
    </>
  );
}
