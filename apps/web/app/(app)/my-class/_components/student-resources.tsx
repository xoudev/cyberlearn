import React from "react";

/**
 * What the class has been given, from the student's side.
 *
 * Only what has actually been released reaches this component - the filtering
 * is in the repository, where both conditions live together, rather than here
 * where a missing branch would show an answer key a day early.
 *
 * Nothing says a resource is being withheld. Telling a student there is a
 * corrigé they cannot open yet is a worse experience than not knowing: it is
 * an itch, and it invites them to go looking.
 */

export interface StudentResourceItem {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  assignmentTitle: string | null;
  createdLabel: string;
}

export function StudentResources({
  items,
}: {
  items: StudentResourceItem[];
}): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section className="cls-card cls-card--resource">
      <h3 className="cls-card__title">Ressources de la classe</h3>
      <p className="cls-subhead">
        {items.length} document{items.length > 1 ? "s" : ""} partagé
        {items.length > 1 ? "s" : ""}
      </p>

      <ul className="cls-res">
        {items.map((r) => (
          <li key={r.id} className="cls-res__item">
            <div className="cls-res__head">
              {r.url !== null ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cls-res__title"
                >
                  {r.title} ↗
                </a>
              ) : (
                <span className="cls-res__title">{r.title}</span>
              )}
              <span className="cls-res__meta">
                {r.assignmentTitle !== null && `${r.assignmentTitle} · `}
                {r.createdLabel}
              </span>
            </div>
            {r.body !== null && r.body.length > 0 && (
              // Plain text, deliberately. A corrigé is written by a teacher in
              // a textarea, and rendering it as markup would mean rendering
              // whatever else ends up in there.
              <pre className="cls-res__body">{r.body}</pre>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
