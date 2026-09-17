import React from "react";
import Link from "next/link";
import { ClassWork, type AssignableLesson, type ClassWorkItem } from "./class-work";
import { ClassLessons, type ClassLessonRow } from "./class-lessons";
import { ClassPaths, type ClassPathRow } from "./class-paths";
import {
  ClassResources,
  type ResourceAssignmentOption,
  type TeacherResourceRow,
} from "./class-resources";

/**
 * The classes a teacher follows, filed the way they already file them.
 *
 * A teacher opens this page with a different question from a student: not
 * "where do I stand" but "who is falling behind". So each class leads with
 * three figures that answer it at a glance - how many students, how far the
 * class has got on average, and how many of them have opened the site this week
 * - and the roster is ordered by progress ascending, because the person who
 * needs attention is the one at the top of a list, not the one buried in it.
 *
 * Names are real here. publicProfile hides a learner from strangers on the
 * leaderboard; it was never meant to hide them from the person responsible for
 * following them, and a roster of "Anonyme" would make the page useless for its
 * one purpose.
 */

export interface TaughtStudent {
  id: string;
  name: string;
  username: string | null;
  level: number;
  completed: number;
  activeThisWeek: boolean;
}

export interface TaughtClass {
  id: string;
  name: string;
  students: TaughtStudent[];
  work: ClassWorkItem[];
  ownLessons: ClassLessonRow[];
  ownPaths: ClassPathRow[];
  resources: TeacherResourceRow[];
  assignmentOptions: ResourceAssignmentOption[];
}

export interface TaughtPromotion {
  id: string;
  name: string;
  startYear: number | null;
  classes: TaughtClass[];
}

export interface TaughtEstablishment {
  id: string;
  name: string;
  city: string | null;
  promotions: TaughtPromotion[];
}

export function TeacherClasses({
  establishments,
  lessons,
}: {
  establishments: TaughtEstablishment[];
  /** The published catalogue, for the picker in each class's assign form. */
  lessons: AssignableLesson[];
}): React.ReactElement {
  return (
    <>
      {establishments.map((est) => (
        <section key={est.id} className="cls-group">
          <h2 className="cls-group__school">{est.name}</h2>
          {est.city !== null && <div className="cls-group__city">{est.city}</div>}

          {est.promotions.map((promo) => (
            <div key={promo.id}>
              <div className="cls-group__intake">
                {promo.name}
                {promo.startYear !== null && ` · ${String(promo.startYear)}`}
              </div>

              <div className="cls-stack">
                {promo.classes.map((c) => (
                  <ClassCard key={c.id} klass={c} lessons={lessons} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function ClassCard({
  klass,
  lessons,
}: {
  klass: TaughtClass;
  lessons: AssignableLesson[];
}): React.ReactElement {
  const { students } = klass;
  const total = students.length;
  const average = total > 0 ? Math.round(students.reduce((n, s) => n + s.completed, 0) / total) : 0;
  const activeCount = students.filter((s) => s.activeThisWeek).length;
  const best = students.reduce((n, s) => Math.max(n, s.completed), 0);

  // Ascending: the class is read to find who has stalled, and a list is read
  // from the top. Ties break on level so two students on zero lessons are not
  // in a random order between two page loads.
  const byNeed = [...students].sort((a, b) => a.completed - b.completed || a.level - b.level);

  return (
    <section className="cls-card cls-card--taught">
      <h3 className="cls-card__title">{klass.name}</h3>

      {/* No students, no figures: "0 élèves · 0 leçons en moyenne · 0/0 actifs"
          is three ways of saying the same nothing, and it fills the card that
          the one sentence below says is empty. */}
      {total > 0 && (
        <div className="cls-stats">
          <div className="cls-stat">
            <div className="cls-stat__value">{total}</div>
            <div className="cls-stat__label">Élèves</div>
          </div>
          <div className="cls-stat">
            <div className="cls-stat__value">{average}</div>
            <div className="cls-stat__label">Leçons en moyenne</div>
          </div>
          <div className="cls-stat">
            <div
              className="cls-stat__value"
              data-tone={
                activeCount === total ? "accent" : activeCount * 2 < total ? "warning" : undefined
              }
            >
              {activeCount}
              <span style={{ fontSize: 12, color: "#6B6890" }}>/{total}</span>
            </div>
            <div className="cls-stat__label">Actifs sur 7 j</div>
          </div>
        </div>
      )}

      {/* The work before the roster: a teacher opens this to check on what they
          set, and the names are how they check. */}
      <ClassWork classId={klass.id} items={klass.work} lessons={lessons} />

      {/* Paths before the loose lessons: a path is the shape the platform puts
          in front of people first, and a teacher handing their class one beats
          handing them a pile with deadlines on it. */}
      <ClassPaths classId={klass.id} paths={klass.ownPaths} />

      {/* After the work, because a lesson written here is material rather than
          an instruction - the class is told to do it by assigning it above. */}
      <ClassLessons classId={klass.id} lessons={klass.ownLessons} />

      <ClassResources
        classId={klass.id}
        resources={klass.resources}
        assignments={klass.assignmentOptions}
      />

      {total === 0 ? (
        <p className="cls-empty">Aucun élève dans cette classe.</p>
      ) : (
        <>
          <p className="cls-subhead">Du moins avancé au plus avancé</p>
          <ul className="cls-people">
            {byNeed.map((s) => (
              <li key={s.id} className="cls-person">
                <span className="cls-person__name">
                  {s.username !== null ? <Link href={`/u/${s.username}`}>{s.name}</Link> : s.name}
                </span>
                <span className="cls-person__bar">
                  <span
                    style={{ width: `${String(best === 0 ? 0 : (s.completed / best) * 100)}%` }}
                  />
                </span>
                <span className="cls-person__meta">
                  LVL·{s.level} · {s.completed} leçon{s.completed > 1 ? "s" : ""}
                  {!s.activeThisWeek && " · inactif"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
