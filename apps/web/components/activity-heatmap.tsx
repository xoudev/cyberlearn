import React from "react";
import { activityMonths } from "./activity-months";
import "./activity-history.css";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Server-rendered history, shared by the private and public profile. */
export function ActivityHeatmap({
  activity,
  today,
  label = "Activité des douze derniers mois",
  personal = true,
}: {
  activity: Record<string, number>;
  today: string;
  label?: string;
  personal?: boolean;
}): React.ReactElement {
  const months = activityMonths(activity, today);
  const first = months[0];
  const last = months[months.length - 1];
  const activeDays = Object.entries(activity)
    .filter(([day, count]) => day <= today && count > 0)
    .sort(([left], [right]) => right.localeCompare(left));
  const hasActivity = months.some((month) => month.days > 0);
  const peak = Math.max(1, ...months.map((month) => month.days));

  return (
    <section className="activity-history" aria-label={label}>
      <header className="activity-history__head">
        <h4>{personal ? "Ton rythme, mois après mois." : "Son rythme, mois après mois."}</h4>
        <p>
          {first?.fullLabel} à {last?.fullLabel}
          <span>Jours actifs · mois en cours inclus</span>
        </p>
      </header>
      {hasActivity ? (
        <ol className="activity-history__months" aria-label="Jours actifs par mois">
          {months.map((month) => (
            <li
              key={month.key}
              data-current={month.key === today.slice(0, 7)}
              aria-current={month.key === today.slice(0, 7) ? "date" : undefined}
            >
              <span className="sr-only">
                {`${month.fullLabel} : ${String(month.days)} ${month.days === 1 ? "jour actif" : "jours actifs"}`}
              </span>
              <div className="activity-history__column" aria-hidden="true">
                <strong>{month.days}</strong>
                <span
                  className="activity-history__bar"
                  style={{ height: `${String((month.days / peak) * 100)}%` }}
                />
              </div>
              <time dateTime={month.key} aria-hidden="true">
                {month.label}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <div className="activity-history__empty">
          <strong>
            {personal ? "Une leçon. Le début d’un rythme." : "Aucun jour actif pour l’instant."}
          </strong>
          <p>
            {personal
              ? "Les jours où tu apprends apparaîtront ici, mois après mois."
              : "Les journées d’apprentissage apparaîtront ici, mois après mois."}
          </p>
        </div>
      )}
      {activeDays.length > 0 && (
        <details className="activity-history__details">
          <summary>Détail des jours actifs</summary>
          <div
            className="activity-history__daily"
            role="region"
            aria-label="Détail quotidien"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">Historique quotidien disponible</caption>
              <thead>
                <tr>
                  <th scope="col">Jour</th>
                  <th scope="col">Activités</th>
                </tr>
              </thead>
              <tbody>
                {activeDays.map(([day, count]) => (
                  <tr key={day}>
                    <th scope="row">
                      <time dateTime={day}>{dayFormat.format(new Date(`${day}T00:00:00Z`))}</time>
                    </th>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
