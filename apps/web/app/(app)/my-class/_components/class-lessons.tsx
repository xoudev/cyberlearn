"use client";

import React, { useActionState, useTransition } from "react";
import Link from "next/link";
import {
  createClassLessonAction,
  deleteClassLessonAction,
  type ClassLessonState,
} from "../_actions/class-lesson-actions";

/**
 * The lessons a teacher wrote for this class, and the form that writes another.
 *
 * Deliberately a plain form over the same fields the catalogue's own lessons
 * have, rather than a second kind of content with a second kind of editor: what
 * comes out is an ordinary lesson, so it renders through the same MDX pipeline,
 * earns XP, enters the review schedule, and can be assigned with a deadline.
 *
 * Folded by default like the assign form beside it. Writing a lesson happens
 * now and then; checking on a class happens every day.
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

const CATEGORIES = [
  { value: "CYBERSEC", label: "Cybersécurité" },
  { value: "DEV", label: "Développement" },
  { value: "NETWORK", label: "Réseaux" },
] as const;

const DIFFICULTIES = [
  { value: "BEGINNER", label: "Débutant" },
  { value: "INTERMEDIATE", label: "Intermédiaire" },
  { value: "ADVANCED", label: "Avancé" },
  { value: "EXPERT", label: "Expert" },
] as const;

export function ClassLessons({
  classId,
  lessons,
}: {
  classId: string;
  lessons: ClassLessonRow[];
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<ClassLessonState, FormData>(
    createClassLessonAction,
    {},
  );
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
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  startRemove(async () => {
                    await deleteClassLessonAction(l.id);
                  });
                }}
                className="cls-work__remove"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="cls-assign">
        <summary className="cls-assign__head">Écrire une leçon pour cette classe</summary>

        <form action={formAction} className="cls-assign__form">
          <input type="hidden" name="classId" value={classId} />

          <label className="cls-field">
            <span className="cls-field__label">Titre</span>
            <input name="title" required minLength={3} maxLength={200} className="cls-input" />
          </label>

          <label className="cls-field">
            <span className="cls-field__label">Description</span>
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={500}
              rows={2}
              className="cls-input"
            />
            <span className="cls-field__hint">
              La ligne qui s&apos;affiche sous le titre dans la liste des leçons.
            </span>
          </label>

          <div className="cls-grid2">
            <label className="cls-field">
              <span className="cls-field__label">Catégorie</span>
              <select name="category" required className="cls-input">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="cls-field">
              <span className="cls-field__label">Niveau</span>
              <select name="difficulty" required className="cls-input">
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="cls-field">
              <span className="cls-field__label">Durée (min)</span>
              <input
                name="estimatedMinutes"
                type="number"
                min={1}
                max={600}
                defaultValue={20}
                required
                className="cls-input"
              />
            </label>

            <label className="cls-field">
              <span className="cls-field__label">XP</span>
              <input
                name="xpReward"
                type="number"
                min={0}
                max={200}
                defaultValue={30}
                required
                className="cls-input"
              />
              <span className="cls-field__hint">
                Plafonné à 200 : tes élèves sont classés avec tout le monde.
              </span>
            </label>
          </div>

          <label className="cls-field">
            <span className="cls-field__label">Contenu (Markdown)</span>
            <textarea
              name="contentMdx"
              required
              minLength={10}
              rows={12}
              placeholder={"## Introduction\n\nExplique ici…\n\n- un point\n- un autre"}
              className="cls-input cls-input--code"
            />
            <span className="cls-field__hint">
              Titres, listes, gras, blocs de code : la leçon est rendue par le même pipeline que
              celles du catalogue.
            </span>
          </label>

          <button type="submit" disabled={pending} className="cls-btn">
            {pending ? "…" : "Publier pour cette classe"}
          </button>

          {state.error !== undefined && (
            <p className="cls-alert" data-tone="bad">
              {state.error}
            </p>
          )}
          {state.ok === true && state.slug !== undefined && (
            <p className="cls-alert">
              Publiée.{" "}
              <Link href={`/lessons/${state.slug}`} style={{ color: "#0AFFD4" }}>
                Voir la leçon
              </Link>
            </p>
          )}
        </form>
      </details>
    </div>
  );
}
