import React from "react";
import Link from "next/link";
import { categoryMeta } from "@cyberlearn/lib/content/vocabulary";

const CAT_COLORS: Record<string, string> = {
  CYBERSEC: "var(--color-category-cybersec)",
  DEV: "var(--color-rarity-rare)",
  NETWORK: "var(--color-brand-turquoise)",
};

export interface ReviewRow {
  id: string;
  nextReviewAt: Date;
  lesson: { slug: string; title: string; category: string; estimatedMinutes: number };
}

/** "Aujourd'hui", "En retard de 1 jour", "En retard de 3 jours". */
export function dueLabel(nextReviewAt: Date, now: Date): { text: string; late: boolean } {
  const overdueDays = Math.floor((now.getTime() - nextReviewAt.getTime()) / 86_400_000);
  if (overdueDays <= 0) return { text: "Aujourd'hui", late: false };
  return {
    text: `En retard de ${String(overdueDays)} jour${overdueDays > 1 ? "s" : ""}`,
    late: true,
  };
}

/**
 * The revisions due today, as rows: a lesson, how late it is, how long it
 * takes. Three at most here; the page for all of them is one link away. An
 * empty day says so in one line rather than hiding the section, so the page
 * keeps its shape from one day to the next.
 */
export function ReviewsDue({
  rows,
  dueTotal,
  now,
}: {
  rows: ReviewRow[];
  /** How many are due in all, the rows being the first three. */
  dueTotal: number;
  now: Date;
}): React.JSX.Element {
  const minutes = rows.reduce((sum, row) => sum + row.lesson.estimatedMinutes, 0);

  return (
    <section className="dash-sec" aria-labelledby="dash-rev-title">
      <div className="dash-sec-head">
        <h2 id="dash-rev-title">À réviser aujourd&apos;hui</h2>
        {rows.length > 0 && (
          <span className="dash-sec-count">
            {dueTotal > rows.length ? `${String(dueTotal)} dues · ` : ""}environ {minutes} min
          </span>
        )}
        {rows.length > 0 && (
          <Link href="/revisions" className="dash-sec-link">
            Tout réviser
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="dash-rev-empty">
          Rien à réviser aujourd&apos;hui. Une révision revient quand une leçon le demande,
          d&apos;après ta courbe d&apos;oubli.
        </p>
      ) : (
        <>
          <ul className="dash-rev-list">
            {rows.map((row) => {
              const due = dueLabel(row.nextReviewAt, now);
              const color = CAT_COLORS[row.lesson.category] ?? "var(--color-rarity-rare)";
              return (
                <li key={row.id}>
                  <Link href={`/lessons/${row.lesson.slug}`} className="dash-rev">
                    <span className="dash-rev-icon" style={{ color }} aria-hidden="true">
                      {row.lesson.category === "CYBERSEC" ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
                        </svg>
                      ) : row.lesson.category === "DEV" ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m8 9-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 0 0 0 18M12 3a14.5 14.5 0 0 1 0 18" />
                        </svg>
                      )}
                    </span>
                    <span className="dash-rev-title">
                      {row.lesson.title}
                      <small>{categoryMeta(row.lesson.category).label}</small>
                    </span>
                    <span className="dash-rev-right">
                      <span className={`dash-rev-due${due.late ? " dash-rev-due--late" : ""}`}>
                        {due.text}
                      </span>
                      <span className="dash-rev-min dash-num">
                        {row.lesson.estimatedMinutes} min
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="dash-rev-note">
            Les révisions suivent ta courbe d&apos;oubli : deux minutes aujourd&apos;hui valent
            vingt dans un mois.
          </p>
        </>
      )}
    </section>
  );
}
