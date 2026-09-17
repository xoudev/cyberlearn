"use client";

import React, { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { filterAssignable } from "@/lib/classes/assignable";
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

/* "" is every category rather than a fourth value: the filter is a narrowing,
   and a teacher who has not narrowed anything should see the whole shelf. */
const CATEGORY_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "CYBERSEC", label: "Cybersécurité" },
  { value: "DEV", label: "Développement" },
  { value: "NETWORK", label: "Réseaux" },
] as const;

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

  const [category, setCategory] = useState<string>("");
  const [chosen, setChosen] = useState<string>("");

  const alreadySet = useMemo(() => new Set(items.map((i) => i.lessonId)), [items]);

  // A lesson already set is not offered again: re-assigning it is changing its
  // deadline, which is a different intent and a different control.
  const matches = useMemo(
    () => filterAssignable(lessons, { alreadySet, category, query }),
    [lessons, alreadySet, category, query],
  );

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

          <input type="hidden" name="lessonId" value={chosen} />

          <div className="cls-field">
            <span className="cls-field__label">
              Leçon · <b className="cw-count">{matches.length}</b> au choix
              {alreadySet.size > 0 &&
                ` · ${String(alreadySet.size)} déjà assignée${alreadySet.size > 1 ? "s" : ""}`}
            </span>

            <div className="cw-filters">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                placeholder="Chercher une leçon…"
                aria-label="Chercher une leçon"
                className="cls-input"
              />
              <div className="cw-cats">
                {CATEGORY_FILTERS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className="cw-cat"
                    data-active={category === c.value}
                    onClick={() => {
                      setCategory(c.value);
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {matches.length === 0 ? (
              <p className="cls-empty">
                Aucune leçon ne correspond, ou toutes sont déjà assignées.
              </p>
            ) : (
              <ul className="cw-pool">
                {matches.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className="cw-pool__row"
                      data-chosen={chosen === l.id}
                      onClick={() => {
                        setChosen(l.id);
                      }}
                    >
                      <span className="cw-pool__mark" aria-hidden="true">
                        {chosen === l.id ? "●" : "○"}
                      </span>
                      <span className="cw-pool__title">{l.title}</span>
                      <span className="cw-pool__cat">{l.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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

          <button type="submit" disabled={pending || chosen === ""} className="cls-btn">
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
