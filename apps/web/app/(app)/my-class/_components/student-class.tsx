import React from "react";
import Link from "next/link";

/**
 * A student's own class, and where they stand in it.
 *
 * The page used to show a learner a list of names and nothing else - which is
 * the teacher's view of a class with the teaching removed. What a student comes
 * here for is the other question: how am I doing compared to the people sitting
 * next to me, and who do I ask when I am stuck. So the teachers are named at
 * the top, their own standing is a strip of figures, and the roster is ordered
 * by progress with their own row picked out.
 *
 * A classmate who has turned publicProfile off reads as "Anonyme", the same way
 * they already do on the leaderboard: one preference, honoured everywhere,
 * rather than a second setting for a second surface. Their progress bar still
 * shows - the class average means nothing if a third of the class is missing
 * from it - but nothing on the row says who they are.
 *
 * It takes its data rather than fetching it. The page already has the roster
 * for the teacher view and would otherwise read the same rows twice, and a
 * component that only renders can be rendered somewhere other than a request -
 * which is how the layout was checked rather than assumed.
 */

export interface StudentClassMember {
  id: string;
  name: string;
  username: string | null;
  visible: boolean;
  level: number;
  xpTotal: number;
  completed: number;
}

export interface ClassHeading {
  id: string;
  name: string;
  establishment: string;
  promotion: string;
}

export interface StudentClassTeacher {
  id: string;
  name: string;
  subject: string | null;
}

export function StudentClass({
  userId,
  heading,
  teachers,
  people,
}: {
  userId: string;
  /**
   * Where the class sits, from the membership query that already read it.
   * findMembersVisibleTo answers "who is in it" and does not carry the filing,
   * and asking it to would make every caller pay for a join two of them do not
   * need.
   */
  heading: ClassHeading;
  teachers: StudentClassTeacher[];
  people: StudentClassMember[];
}): React.ReactElement {
  const ranked = [...people].sort((a, b) => b.completed - a.completed || b.xpTotal - a.xpTotal);
  const best = ranked[0]?.completed ?? 0;
  const me = people.find((p) => p.id === userId);
  const myRank = ranked.findIndex((p) => p.id === userId) + 1;
  const classAverage =
    people.length > 0 ? Math.round(people.reduce((n, p) => n + p.completed, 0) / people.length) : 0;

  return (
    <section className="cls-card">
      <div className="cls-card__eyebrow">
        {heading.establishment} · {heading.promotion}
      </div>
      <h2 className="cls-card__title">{heading.name}</h2>

      {teachers.length > 0 && (
        <p className="cls-card__teachers">
          {teachers.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 && " · "}
              <b>{t.name}</b>
              {t.subject !== null && ` (${t.subject})`}
            </React.Fragment>
          ))}
        </p>
      )}

      {/* Their own standing, before the list of everyone else's. A rank is only
          worth printing next to what it is a rank among, so the class size and
          its average sit beside it. */}
      {me !== undefined && (
        <div className="cls-stats">
          <div className="cls-stat">
            <div className="cls-stat__value" data-tone="accent">
              {myRank}
              <span style={{ fontSize: 12, color: "#6B6890" }}>/{people.length}</span>
            </div>
            <div className="cls-stat__label">Ton rang</div>
          </div>
          <div className="cls-stat">
            <div className="cls-stat__value">{me.completed}</div>
            <div className="cls-stat__label">Leçons faites</div>
          </div>
          <div className="cls-stat">
            <div className="cls-stat__value">{classAverage}</div>
            <div className="cls-stat__label">Moyenne classe</div>
          </div>
          <div className="cls-stat">
            <div className="cls-stat__value">{me.level}</div>
            <div className="cls-stat__label">Niveau</div>
          </div>
        </div>
      )}

      <p className="cls-subhead">
        {people.length <= 1
          ? "Tu es seul·e dans cette classe pour l'instant"
          : `${String(people.length)} élèves`}
      </p>

      {people.length <= 1 ? (
        <p className="cls-empty">Les autres élèves apparaîtront ici dès qu&apos;ils rejoindront.</p>
      ) : (
        <ul className="cls-people">
          {ranked.map((p) => (
            <li key={p.id} className="cls-person" data-self={p.id === userId}>
              <span className="cls-person__name">
                {p.visible && p.username !== null ? (
                  <Link href={`/u/${p.username}`}>{p.name}</Link>
                ) : (
                  p.name
                )}
              </span>
              <span className="cls-person__bar">
                <span
                  style={{ width: `${String(best === 0 ? 0 : (p.completed / best) * 100)}%` }}
                />
              </span>
              <span className="cls-person__meta">
                LVL·{p.level} · {p.completed} leçon{p.completed > 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
