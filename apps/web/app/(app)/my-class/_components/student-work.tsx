import React from "react";
import Link from "next/link";

/**
 * What the class has been told to do, from the student's side.
 *
 * Ordered by what is most pressing rather than by when it was set: overdue
 * first, then by deadline, then the work with no deadline, then what is already
 * done. A list that opens on three finished lessons is a list nobody scrolls.
 *
 * Completion is read from the student's own lesson progress, so a lesson
 * finished before it was ever assigned counts - which is the honest answer, and
 * avoids telling someone to do again what they have already done.
 */

export interface StudentWorkItem {
  lessonId: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  instructions: string | null;
  dueAt: Date | null;
  done: boolean;
}

function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(d);
}

/** Overdue, then soonest first, then undated, then everything already done. */
function rank(item: StudentWorkItem, now: number): number {
  if (item.done) return 3;
  if (item.dueAt === null) return 2;
  return item.dueAt.getTime() < now ? 0 : 1;
}

export function StudentWork({ items }: { items: StudentWorkItem[] }): React.ReactElement | null {
  // Nothing set is not an empty state worth a card: the class simply has no
  // work, and a box saying so is a box that asks to be filled by the reader,
  // who cannot fill it.
  if (items.length === 0) return null;

  const now = Date.now();
  const sorted = [...items].sort(
    (a, b) =>
      rank(a, now) - rank(b, now) ||
      (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
  );
  const remaining = items.filter((i) => !i.done).length;
  const late = items.filter((i) => !i.done && i.dueAt !== null && i.dueAt.getTime() < now).length;

  return (
    <section className="cls-card cls-card--work">
      <h3 className="cls-card__title">Ton travail</h3>
      <p className="cls-subhead">
        {remaining === 0
          ? "Tout est fait"
          : `${String(remaining)} leçon${remaining > 1 ? "s" : ""} à faire`}
        {late > 0 && ` · ${String(late)} en retard`}
      </p>

      <ul className="cls-work">
        {sorted.map((item) => {
          const overdue = !item.done && item.dueAt !== null && item.dueAt.getTime() < now;
          const state = item.done ? "done" : overdue ? "late" : "todo";
          return (
            <li key={item.lessonId} className="cls-work__row" data-state={state}>
              <span className="cls-work__mark" aria-hidden="true">
                {item.done ? "✓" : overdue ? "!" : "○"}
              </span>
              <span className="cls-work__body">
                <Link href={`/lessons/${item.slug}`} className="cls-work__title">
                  {item.title}
                </Link>
                {item.instructions !== null && (
                  <span className="cls-work__note">{item.instructions}</span>
                )}
              </span>
              <span className="cls-work__due">
                {item.done
                  ? "Fait"
                  : item.dueAt === null
                    ? `${String(item.estimatedMinutes)} min`
                    : overdue
                      ? `En retard · ${dayLabel(item.dueAt)}`
                      : `Avant le ${dayLabel(item.dueAt)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
