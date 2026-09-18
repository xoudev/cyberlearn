"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createClassPathAction,
  updateClassPathAction,
  type ClassPathState,
} from "../_actions/class-path-actions";
import { Select } from "@cyberlearn/ui";

/**
 * The builder a teacher assembles a class path with.
 *
 * A path is an ordering over lessons, so the ordering is the thing being
 * authored and the screen is built around it: the chosen lessons are a numbered
 * list that moves, and the catalogue beside it is a search. Everything the
 * teacher can open is on the left, in one list - their classes' own lessons and
 * the platform's together, because a path is allowed to mix them and a teacher
 * looking for "le chapitre 3" does not care which shelf it came from.
 *
 * The order leaves as one ordered field rather than one input per lesson: a
 * path with a gap in its positions is a path nobody can walk, and a list of
 * separate inputs is exactly how a gap gets in.
 */

export interface PickableLesson {
  id: string;
  title: string;
  category: string;
  /** Written by the server so the filter below does not lowercase on every keystroke. */
  search: string;
  /** True for a lesson written for one of the teacher's own classes. */
  own: boolean;
}

export interface PathDraft {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  lessonIds: string[];
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

export function PathBuilder({
  mode,
  classId,
  className,
  pathId,
  pathSlug,
  lessons,
  draft,
}: {
  mode: "create" | "edit";
  className: string;
  classId?: string;
  pathId?: string;
  pathSlug?: string;
  lessons: PickableLesson[];
  draft?: PathDraft;
}): React.ReactElement {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ClassPathState, FormData>(
    mode === "create" ? createClassPathAction : updateClassPathAction,
    {},
  );

  const [chosen, setChosen] = useState<string[]>(draft?.lessonIds ?? []);
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const chosenSet = useMemo(() => new Set(chosen), [chosen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((l) => !chosenSet.has(l.id) && (q === "" || l.search.includes(q)));
  }, [lessons, chosenSet, query]);

  const createdSlug = mode === "create" && state.ok === true ? state.slug : undefined;
  useEffect(() => {
    if (createdSlug !== undefined) router.push(`/paths/${createdSlug}`);
  }, [createdSlug, router]);

  const move = (from: number, to: number): void => {
    if (to < 0 || to >= chosen.length) return;
    setChosen((prev) => {
      const next = [...prev];
      const [taken] = next.splice(from, 1);
      if (taken !== undefined) next.splice(to, 0, taken);
      return next;
    });
  };

  return (
    <form action={formAction} className="tle-form">
      {mode === "create" ? (
        <input type="hidden" name="classId" value={classId} />
      ) : (
        <input type="hidden" name="pathId" value={pathId} />
      )}
      <input type="hidden" name="lessonIds" value={chosen.join(",")} />

      <div className="tle-meta">
        <label className="cls-field">
          <span className="cls-field__label">Titre</span>
          <input
            name="title"
            required
            minLength={3}
            maxLength={200}
            defaultValue={draft?.title}
            className="cls-input"
            placeholder="Le réseau, du câble au paquet"
          />
        </label>

        <label className="cls-field">
          <span className="cls-field__label">Description</span>
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={1000}
            rows={2}
            defaultValue={draft?.description}
            className="cls-input"
          />
          <span className="cls-field__hint">Ce que la classe saura faire au bout du parcours.</span>
        </label>

        <div className="tle-grid3">
          <label className="cls-field">
            <span className="cls-field__label">Catégorie</span>
            <Select
              name="category"
              required
              defaultValue={draft?.category ?? "CYBERSEC"}
              options={CATEGORIES}
            />
          </label>

          <label className="cls-field">
            <span className="cls-field__label">Niveau</span>
            <Select
              name="difficulty"
              required
              defaultValue={draft?.difficulty ?? "BEGINNER"}
              options={DIFFICULTIES}
            />
          </label>

          <label className="cls-field">
            <span className="cls-field__label">Durée (h)</span>
            <input
              name="estimatedHours"
              type="number"
              min={1}
              max={200}
              required
              defaultValue={draft?.estimatedHours ?? 4}
              className="cls-input"
            />
          </label>
        </div>
      </div>

      <div className="pb-cols">
        {/* ── What the path is, in order ─────────────────────────────────── */}
        <section className="pb-panel">
          <div className="pb-panel__head">
            <span className="cls-field__label">Le parcours</span>
            <span className="cls-field__hint">
              {chosen.length === 0
                ? "vide"
                : `${String(chosen.length)} leçon${chosen.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {chosen.length === 0 ? (
            <p className="cls-empty">
              Ajoute des leçons depuis la liste à droite. L&apos;ordre ici est celui que tes élèves
              suivront.
            </p>
          ) : (
            <ol className="pb-chosen">
              {chosen.map((id, i) => {
                const lesson = byId.get(id);
                return (
                  <li key={id} className="pb-chosen__row">
                    <span className="pb-chosen__rank">{String(i + 1).padStart(2, "0")}</span>
                    <span className="pb-chosen__title">
                      {lesson?.title ?? "Leçon introuvable"}
                      {lesson?.own === true && <b className="pb-tag">classe</b>}
                    </span>
                    <span className="pb-chosen__tools">
                      <button
                        type="button"
                        className="pb-icon"
                        title="Monter"
                        disabled={i === 0}
                        onClick={() => {
                          move(i, i - 1);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="pb-icon"
                        title="Descendre"
                        disabled={i === chosen.length - 1}
                        onClick={() => {
                          move(i, i + 1);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="pb-icon"
                        title="Retirer"
                        data-tone="bad"
                        onClick={() => {
                          setChosen((prev) => prev.filter((x) => x !== id));
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* ── Everything the teacher may put in it ───────────────────────── */}
        <section className="pb-panel">
          <div className="pb-panel__head">
            <span className="cls-field__label">Leçons disponibles</span>
            <span className="cls-field__hint">{String(results.length)} au choix</span>
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            className="cls-input"
            placeholder="Chercher une leçon…"
            aria-label="Chercher une leçon"
          />

          {results.length === 0 ? (
            <p className="cls-empty">Rien ne correspond.</p>
          ) : (
            <ul className="pb-pool">
              {results.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className="pb-pool__row"
                    onClick={() => {
                      setChosen((prev) => [...prev, l.id]);
                    }}
                  >
                    <span className="pb-pool__plus" aria-hidden="true">
                      +
                    </span>
                    <span className="pb-pool__title">
                      {l.title}
                      {l.own && <b className="pb-tag">classe</b>}
                    </span>
                    <span className="pb-pool__cat">{l.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="tle-actions">
        <button type="submit" disabled={pending || chosen.length === 0} className="cls-btn">
          {pending ? "…" : mode === "create" ? `Publier pour ${className}` : "Enregistrer"}
        </button>
        <Link href="/my-class" className="tle-back">
          Retour à la classe
        </Link>
        {mode === "edit" && pathSlug !== undefined && (
          <Link href={`/paths/${pathSlug}`} className="tle-back">
            Voir le parcours
          </Link>
        )}
      </div>

      {chosen.length === 0 && (
        <p className="cls-field__hint">Un parcours sans leçon ne mène nulle part.</p>
      )}
      {state.error !== undefined && (
        <p className="cls-alert" data-tone="bad">
          {state.error}
        </p>
      )}
      {mode === "edit" && state.ok === true && <p className="cls-alert">Enregistré.</p>}
    </form>
  );
}
