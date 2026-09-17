"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { deleteClassLessonAction } from "../_actions/class-lesson-actions";

/**
 * The lessons a teacher wrote for this class, and the way in to writing another.
 *
 * What comes out is an ordinary lesson: it renders through the same MDX
 * pipeline, earns XP, enters the review schedule, and can be given with a
 * deadline. So it is written with the same editor as the catalogue's own,
 * which needs a page of its own - a Monaco split preview does not belong in a
 * details block beside a roster. This card keeps the list and the two doors:
 * write one, or reopen one.
 */

export interface ClassLessonRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  createdLabel: string;
}

export function ClassLessons({
  classId,
  lessons,
}: {
  classId: string;
  lessons: ClassLessonRow[];
}): React.ReactElement {
  const [removing, startRemove] = useTransition();

  return (
    <div className="cls-work-block">
      <p className="cls-subhead">
        Leçons de la classe{lessons.length > 0 && ` · ${String(lessons.length)}`}
      </p>

      {lessons.length === 0 ? (
        <p className="cls-empty">
          Aucune leçon propre à cette classe. Celles que tu écris ici ne sont visibles que par elle.
        </p>
      ) : (
        <ul className="cls-work">
          {lessons.map((l) => (
            <li key={l.id} className="cls-work__row" data-state="todo">
              <span className="cls-work__mark" aria-hidden="true">
                ✎
              </span>
              <span className="cls-work__body">
                <Link href={`/lessons/${l.slug}`} className="cls-work__title">
                  {l.title}
                </Link>
                <span className="cls-work__note">
                  {l.estimatedMinutes} min · {l.xpReward} XP · écrite le {l.createdLabel}
                </span>
              </span>
              <span className="cls-work__tools">
                <Link href={`/my-class/lessons/${l.id}/edit`} className="cls-work__remove">
                  Modifier
                </Link>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => {
                    startRemove(async () => {
                      await deleteClassLessonAction(l.id);
                    });
                  }}
                  className="cls-work__remove"
                  data-tone="bad"
                >
                  Supprimer
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link href={`/my-class/lessons/new?classId=${classId}`} className="cls-btn cls-btn--link">
        Écrire une leçon
      </Link>
    </div>
  );
}
