"use client";

import React, { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  assignLessonAction,
  unassignLessonAction,
  type AssignState,
} from "../_actions/assignment-actions";

/**
 * The work a teacher has set for one class, and the form that sets more.
 *
 * This is the first thing on this page that writes. Which is why the lesson
 * picker filters a list handed down by the server rather than searching from
 * the client: the catalogue is a few hundred published lessons, the filtering
 * is instant, and there is no endpoint to secure that did not need to exist.
 *
 * Each row carries how many of the class have finished it, because that is the
 * question the page is opened with - not "what did I set" but "did they do it".
 */

export interface AssignableLesson {
  id: string;
  title: string;
  category: string;
  search: string;
}

export interface ClassWorkItem {
  lessonId: string;
  slug: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  /** Pre-formatted by the server, which owns the locale. */
  dueLabel: string | null;
  overdue: boolean;
  doneCount: number;
  totalCount: number;
}

const MARK = { done: "✓", late: "!", todo: "○" } as const;

/**
 * The same three states the student sees, read from the class's side: done
 * when everyone has finished it, late when the date has passed and they have
 * not. A class where the deadline is gone and three of twelve have done it is
 * the row a teacher is looking for, so it gets the mark that says so.
 */
function markState(item: ClassWorkItem): keyof typeof MARK {
  if (item.totalCount > 0 && item.doneCount === item.totalCount) return "done";
  return item.overdue ? "late" : "todo";
}

export function ClassWork({
  classId,
  items,
  lessons,
}: {
  classId: string;
  items: ClassWorkItem[];
  lessons: AssignableLesson[];
}): React.ReactElement {
  const [state, formAction, pending] = useActionState<AssignState, FormData>(
    assignLessonAction,
    {},
  );
  const [removing, startRemove] = useTransition();
  const [query, setQuery] = useState("");

  const alreadySet = useMemo(() => new Set(items.map((i) => i.lessonId)), [items]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    // A lesson already set is not offered again: re-assigning it is changing
    // its deadline, which is a different intent and a different control.
    const pool = lessons.filter((l) => !alreadySet.has(l.id));
    return (q.length === 0 ? pool : pool.filter((l) => l.search.includes(q))).slice(0, 30);
  }, [lessons, alreadySet, query]);

  return (
    <div className="cls-work-block">
      <p className="cls-subhead">Travail donné{items.length > 0 && ` · ${String(items.length)}`}</p>

      {items.length === 0 ? (
        <p className="cls-empty">Aucune leçon assignée à cette classe.</p>
      ) : (
        <ul className="cls-work">
          {items.map((item) => (
            <li key={item.lessonId} className="cls-work__row" data-state={markState(item)}>
              <span className="cls-work__mark" aria-hidden="true">
                {MARK[markState(item)]}
              </span>
              <span className="cls-work__body">
                <Link href={`/lessons/${item.slug}`} className="cls-work__title">
                  {item.title}
                </Link>
                <span className="cls-work__note">
                  {item.doneCount}/{item.totalCount} fait{item.doneCount > 1 ? "s" : ""}
                  {item.dueLabel !== null &&
                    ` · ${item.overdue ? "échue le" : "avant le"} ${item.dueLabel}`}
                </span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  startRemove(async () => {
                    await unassignLessonAction(classId, item.lessonId);
                  });
                }}
                className="cls-work__remove"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="cls-assign">
        <summary className="cls-assign__head">Assigner une leçon</summary>

        <form action={formAction} className="cls-assign__form">
          <input type="hidden" name="classId" value={classId} />

          <label className="cls-field">
            <span className="cls-field__label">Filtrer le catalogue</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder="Titre ou catégorie…"
              className="cls-input"
            />
          </label>

          <label className="cls-field">
            <span className="cls-field__label">Leçon</span>
            <select name="lessonId" required className="cls-input" size={6}>
              {matches.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} · {l.category}
                </option>
              ))}
            </select>
            {matches.length === 0 && (
              <span className="cls-field__hint">
                Aucune leçon ne correspond, ou toutes sont déjà assignées.
              </span>
            )}
          </label>

          <label className="cls-field">
            <span className="cls-field__label">À rendre avant · optionnel</span>
            <input type="date" name="dueAt" className="cls-input" />
            <span className="cls-field__hint">
              La date compte jusqu&apos;à minuit : « le 20 » veut dire que le 20 est encore à
              l&apos;heure.
            </span>
          </label>

          <label className="cls-field">
            <span className="cls-field__label">Consigne · optionnel</span>
            <textarea
              name="instructions"
              rows={2}
              maxLength={1000}
              placeholder="Faire les exercices 1 à 4."
              className="cls-input"
            />
          </label>

          <button type="submit" disabled={pending || matches.length === 0} className="cls-btn">
            {pending ? "…" : "Assigner à la classe"}
          </button>

          {state.error !== undefined && (
            <p className="cls-alert" data-tone="bad">
              {state.error}
            </p>
          )}
          {state.ok === true && (
            <p className="cls-alert">
              Assigné.
              {state.notified !== undefined &&
                state.notified > 0 &&
                ` ${String(state.notified)} élève${state.notified > 1 ? "s" : ""} prévenu${state.notified > 1 ? "s" : ""}.`}
            </p>
          )}
        </form>
      </details>
    </div>
  );
}
