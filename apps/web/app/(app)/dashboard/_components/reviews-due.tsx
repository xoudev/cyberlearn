import React from "react";
import Link from "next/link";
import { categoryMeta } from "@cyberlearn/lib/content/vocabulary";

const CAT_COLORS: Record<string, string> = {
  CYBERSEC: "#FF4757",
  DEV: "#6E8BFF",
  NETWORK: "#0AFFD4",
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
              return (
                <li key={row.id}>
                  <Link href={`/lessons/${row.lesson.slug}`} className="dash-rev">
                    <i
                      className="dash-rev-dot"
                      style={{ background: CAT_COLORS[row.lesson.category] ?? "#6E8BFF" }}
                      aria-hidden="true"
                    />
                    <span className="dash-rev-title">
                      {row.lesson.title}
                      <small>{categoryMeta(row.lesson.category).label}</small>
                    </span>
                    <span className={`dash-rev-due${due.late ? " dash-rev-due--late" : ""}`}>
                      {due.text}
                    </span>
                    <span className="dash-rev-min dash-num">{row.lesson.estimatedMinutes} min</span>
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
