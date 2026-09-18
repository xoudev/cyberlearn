"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdxEditorPanel } from "@cyberlearn/ui/mdx-editor";
import {
  createClassLessonAction,
  updateClassLessonAction,
  type ClassLessonState,
} from "../_actions/class-lesson-actions";
import { Select } from "@cyberlearn/ui";

/**
 * The editor a teacher writes a class lesson with.
 *
 * It is the admin console's editor, not a smaller one built to look like it:
 * the same MdxEditorPanel, shared from the design system, with the same
 * toolbar, the same live preview and the same guide to every component the
 * lesson pipeline understands. What a teacher writes goes through that
 * pipeline, so anything less would have them composing against a preview that
 * lies, and discovering it on the class's screens.
 *
 * On its own page rather than folded into the class card: an editor with a
 * split preview does not fit in a details block beside a roster, and writing a
 * lesson is a sitting-down job, not something done in passing.
 *
 * One component for writing and for reopening, because they are the same form
 * over the same fields. The difference is which action it posts to and what
 * happens afterwards - a new lesson opens so its author can see what the class
 * will see, a reopened one stays put so they can keep working.
 */

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

const STARTER = `## Introduction

Explique ici ce que la leçon couvre et pourquoi.

<Callout type="info">
  Un encadré pour un point à retenir.
</Callout>

## À toi

<Quiz
  id="q-1"
  question="Pose une question de vérification."
  options={["Première réponse", "Deuxième", "Troisième", "Quatrième"]}
  correct={0}
/>
`;

export interface LessonDraft {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  contentMdx: string;
}

export function LessonEditor({
  mode,
  classId,
  className,
  lessonId,
  lessonSlug,
  draft,
}: {
  mode: "create" | "edit";
  /** The class the lesson belongs to. Carried in both modes, for the caption. */
  className: string;
  /** Create only: which class receives it. */
  classId?: string;
  /** Edit only: which lesson is being reopened. */
  lessonId?: string;
  /** Edit only: where to go to read it. */
  lessonSlug?: string;
  draft?: LessonDraft;
}): React.ReactElement {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ClassLessonState, FormData>(
    mode === "create" ? createClassLessonAction : updateClassLessonAction,
    {},
  );
  const [mdx, setMdx] = useState(draft?.contentMdx ?? STARTER);

  // A created lesson is worth opening: the point of writing one is what the
  // class ends up reading, and the rendered page is the only place that shows
  // it. A saved one is not - the teacher is still in it.
  const createdSlug = mode === "create" && state.ok === true ? state.slug : undefined;
  useEffect(() => {
    if (createdSlug !== undefined) router.push(`/lessons/${createdSlug}`);
  }, [createdSlug, router]);

  return (
    <form action={formAction} className="tle-form">
      {mode === "create" ? (
        <input type="hidden" name="classId" value={classId} />
      ) : (
        <input type="hidden" name="lessonId" value={lessonId} />
      )}
      <input type="hidden" name="contentMdx" value={mdx} />

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
            placeholder="Les injections SQL, en pratique"
          />
        </label>

        <label className="cls-field">
          <span className="cls-field__label">Description</span>
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={500}
            rows={2}
            defaultValue={draft?.description}
            className="cls-input"
          />
          <span className="cls-field__hint">
            La ligne qui s&apos;affiche sous le titre dans la liste des leçons.
          </span>
        </label>

        <div className="tle-grid4">
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
            <span className="cls-field__label">Durée (min)</span>
            <input
              name="estimatedMinutes"
              type="number"
              min={1}
              max={600}
              required
              defaultValue={draft?.estimatedMinutes ?? 20}
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
              required
              defaultValue={draft?.xpReward ?? 30}
              className="cls-input"
            />
            <span className="cls-field__hint">
              Plafonné à 200 : tes élèves sont classés avec tout le monde.
            </span>
          </label>
        </div>
      </div>

      <div className="tle-editor">
        <div className="tle-editor__head">
          <span className="cls-field__label">Contenu</span>
          <span className="cls-field__hint">
            Monaco · aperçu en direct · le même éditeur que la console
          </span>
        </div>
        <MdxEditorPanel value={mdx} onChange={setMdx} />
      </div>

      <div className="tle-actions">
        <button type="submit" disabled={pending} className="cls-btn">
          {pending ? "…" : mode === "create" ? `Publier pour ${className}` : "Enregistrer"}
        </button>
        <Link href="/my-class" className="tle-back">
          Retour à la classe
        </Link>
        {mode === "edit" && lessonSlug !== undefined && (
          <Link href={`/lessons/${lessonSlug}`} className="tle-back">
            Voir la leçon
          </Link>
        )}
      </div>

      {state.error !== undefined && (
        <p className="cls-alert" data-tone="bad">
          {state.error}
        </p>
      )}
      {mode === "edit" && state.ok === true && <p className="cls-alert">Enregistré.</p>}
    </form>
  );
}
