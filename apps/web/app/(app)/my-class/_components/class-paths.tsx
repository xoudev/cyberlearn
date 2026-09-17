"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { deleteClassPathAction } from "../_actions/class-path-actions";

/**
 * The paths a teacher built for this class, and the way in to building another.
 *
 * A path is what the platform puts in front of everyone first, so a teacher
 * ought to be able to hand their class one rather than a loose pile of lessons
 * with deadlines. What comes out is an ordinary Path: progression, XP and the
 * path page all work on it unchanged. What differs is who may open it.
 *
 * Deleting one leaves its lessons standing, which is worth saying on the
 * button's own screen rather than hoping it is guessed: the ordering goes, the
 * material and the progress made on it stay.
 */

export interface ClassPathRow {
  id: string;
  slug: string;
  title: string;
  lessonCount: number;
  estimatedHours: number;
  createdLabel: string;
}

export function ClassPaths({
  classId,
  paths,
}: {
  classId: string;
  paths: ClassPathRow[];
}): React.ReactElement {
  const [removing, startRemove] = useTransition();

  return (
    <div className="cls-work-block">
      <p className="cls-subhead">
        Parcours de la classe{paths.length > 0 && ` · ${String(paths.length)}`}
      </p>

      {paths.length === 0 ? (
        <p className="cls-empty">
          Aucun parcours propre à cette classe. Un parcours enchaîne des leçons dans l&apos;ordre où
          tu veux qu&apos;elles soient suivies.
        </p>
      ) : (
        <ul className="cls-work">
          {paths.map((p) => (
            <li key={p.id} className="cls-work__row" data-state="todo">
              <span className="cls-work__mark" aria-hidden="true">
                ⌁
              </span>
              <span className="cls-work__body">
                <Link href={`/paths/${p.slug}`} className="cls-work__title">
                  {p.title}
                </Link>
                <span className="cls-work__note">
                  {p.lessonCount} leçon{p.lessonCount > 1 ? "s" : ""} · {p.estimatedHours} h · créé
                  le {p.createdLabel}
                </span>
              </span>
              <span className="cls-work__tools">
                <Link href={`/my-class/paths/${p.id}/edit`} className="cls-work__remove">
                  Modifier
                </Link>
                <button
                  type="button"
                  disabled={removing}
                  title="Les leçons du parcours, elles, restent"
                  onClick={() => {
                    startRemove(async () => {
                      await deleteClassPathAction(p.id);
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

      <Link href={`/my-class/paths/new?classId=${classId}`} className="cls-btn cls-btn--link">
        Créer un parcours
      </Link>
    </div>
  );
}
