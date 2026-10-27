"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  createLessonAction,
  getNextRefCodeAction,
  type CreateLessonState,
} from "../../_actions/lesson-actions";
import { MdxEditorPanel, useLessonPreview } from "@cyberlearn/ui/mdx-editor";
import { refreshLessonPreviewAction } from "../../_actions/preview-actions";
import { CoverUploadField } from "../../_components/cover-upload-field";
import { MultiSelect, Select } from "@cyberlearn/ui";
import { keepFormInput } from "@/lib/form-input";
import { LESSON_LIMITS, LESSON_SLUG_HINT, LESSON_SLUG_PATTERN } from "@/lib/lesson-limits";

/**
 * The lesson creation form: the lesson's fields across the page, in the grid
 * the studio uses (.a-studio-fields), then the editor and its preview at the
 * page's full width. The fields used to stack in pairs down a narrow column
 * above an editor that split the rest; they now take the width they need and
 * leave the editor all of it.
 */

// ── MDX starter template ──────────────────────────────────────────────────────

const MDX_STARTER = `# Titre de la leçon

Introduction du sujet.

## 1. Première section

Contenu de la section.

\`\`\`bash
# exemple de commande
echo "hello"
\`\`\`

## 2. Exercice pratique

<CodePlayground
  language="python"
  starterCode={\`print("Hello, CyberLearn!")\`}
/>

<Quiz
  id="q-1"
  question="Question de vérification ?"
  options={["Option A", "Option B", "Option C"]}
  correct={0}
/>
`;

// ── Field chrome ──────────────────────────────────────────────────────────────

function Label({
  children,
  htmlFor,
  hint,
  req,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
  req?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="a-label">
      {children}
      {req && (
        <span className="a-studio-field-error" aria-hidden="true">
          {" "}
          *
        </span>
      )}
      {hint && <span className="a-label-optional"> · {hint}</span>}
    </label>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return <span className="a-field-hint">{children}</span>;
}

function FieldErr({ msg }: { msg?: string | undefined }) {
  return msg ? <span className="a-field-hint a-studio-field-error">{msg}</span> : null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const initialState: CreateLessonState = {};

/** A path or a lesson the new lesson can be linked to. */
export interface LinkOption {
  id: string;
  refCode: string;
  title: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export function NewLessonForm({
  lessonUrlPrefix,
  pathOptions,
  lessonOptions,
}: {
  /** The lesson's address on the learner site, up to the slug. */
  lessonUrlPrefix: string;
  /** The catalogue paths the lesson can join. */
  pathOptions: readonly LinkOption[];
  /** The catalogue lessons it can require. */
  lessonOptions: readonly LinkOption[];
}): React.ReactElement {
  const [state, action, isPending] = useActionState(createLessonAction, initialState);
  const [mdx, setMdx] = useState(MDX_STARTER);
  const [pathIds, setPathIds] = useState<string[]>([]);
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>([]);
  const [refCode, setRefCode] = useState("");
  // Typed by hand: the proposal no longer follows the first path.
  const [refCodeTyped, setRefCodeTyped] = useState(false);
  const [editingRefCode, setEditingRefCode] = useState(false);
  const refCodeOpen = editingRefCode || state.fieldErrors?.refCode !== undefined;
  const preview = useLessonPreview(refreshLessonPreviewAction);

  // The first path chosen gives the code its PP and the lesson's rank at the
  // end of that path, recaps not counted; without one, the next code of the
  // catalogue.
  const firstPathId = pathIds[0] ?? null;
  useEffect(() => {
    if (refCodeTyped) return;
    let current = true;
    getNextRefCodeAction(firstPathId)
      .then(({ nextRefCode }) => {
        if (current) setRefCode(nextRefCode);
      })
      .catch(() => {
        // Leave the field as it is: the admin can type a code.
      });
    return () => {
      current = false;
    };
  }, [firstPathId, refCodeTyped]);

  const firstPath = pathOptions.find((p) => p.id === firstPathId);

  return (
    <>
      {/* Global error */}
      {state.error && (
        <div className="a-form-error" role="alert" style={{ marginBottom: 24 }}>
          {state.error}
        </div>
      )}

      <form action={action} onReset={keepFormInput} className="a-lesson-form">
        {/* Hidden MDX content */}
        <input type="hidden" name="contentMdx" value={mdx} />

        <div className="a-studio-fields" role="group" aria-label="Fiche de la leçon">
          {/* Paths + prerequisites: the first path names the refCode below. */}
          <div className="a-field a-studio-span-2">
            <Label hint="le premier donne le ref code">Parcours</Label>
            <MultiSelect
              aria-label="Parcours"
              name="pathIds"
              options={pathOptions.map((p) => ({
                value: p.id,
                label: p.title,
                hint: p.status === "DRAFT" ? `${p.refCode} · brouillon` : p.refCode,
              }))}
              value={pathIds}
              onChange={setPathIds}
              placeholder="Dans aucun parcours"
              searchPlaceholder="Titre ou refCode du parcours…"
              summary={(count) => `${String(count)} parcours`}
            />
            <Help>
              La leçon s&apos;ajoute à la fin de chaque parcours choisi, dans son dernier module.
            </Help>
            <FieldErr msg={state.fieldErrors?.pathIds} />
          </div>
          <div className="a-field a-studio-span-2">
            <Label hint="leçons à suivre avant celle-ci">Prérequis</Label>
            <MultiSelect
              aria-label="Prérequis"
              name="prerequisiteIds"
              options={lessonOptions.map((l) => ({ value: l.id, label: l.title, hint: l.refCode }))}
              value={prerequisiteIds}
              onChange={setPrerequisiteIds}
              placeholder="Aucun prérequis"
              searchPlaceholder="Titre ou refCode de la leçon…"
              summary={(count) => `${String(count)} prérequis`}
            />
            <Help>
              Enregistrés avec la leçon, sans verrou pour l&apos;apprenant : seule sa place dans le
              parcours décide de son ouverture.
            </Help>
            <FieldErr msg={state.fieldErrors?.prerequisiteIds} />
          </div>

          {/* refCode + slug */}
          <div className="a-field a-studio-span-2">
            <Label htmlFor="admin-editor-refCode" req hint="auto-généré, modifiable">
              Ref code
            </Label>
            {refCodeOpen ? (
              <input
                id="admin-editor-refCode"
                name="refCode"
                type="text"
                required
                placeholder="CL-LSN-01001-V01"
                value={refCode}
                onChange={(event) => {
                  setRefCode(event.target.value);
                  setRefCodeTyped(true);
                }}
                className="a-input"
              />
            ) : (
              <div className="a-studio-code">
                <input type="hidden" name="refCode" value={refCode} />
                <span className="a-mono">{refCode === "" ? "Calcul…" : refCode}</span>
                <button
                  type="button"
                  className="a-btn a-btn--ghost a-btn--sm"
                  onClick={() => {
                    setEditingRefCode(true);
                  }}
                >
                  Modifier
                </button>
              </div>
            )}
            <Help>
              {refCodeTyped ? (
                <>
                  Saisi à la main.{" "}
                  <button
                    type="button"
                    className="a-btn a-btn--ghost a-btn--sm"
                    onClick={() => {
                      setRefCodeTyped(false);
                      setEditingRefCode(false);
                    }}
                  >
                    Revenir au code proposé
                  </button>
                </>
              ) : firstPath !== undefined ? (
                <>
                  Tiré du parcours <b>{firstPath.title}</b> et du rang de la leçon, bilans de module
                  non comptés.
                </>
              ) : (
                <>Le prochain code libre du catalogue, faute de parcours.</>
              )}
            </Help>
            <Help>
              Format :{" "}
              <b className="a-mono">
                CL-LSN-{"{NNN}"}-V{"{NN}"} ou CL-LSN-{"{PPNNN}"}-V{"{NN}"}
              </b>{" "}
              · doit être unique
            </Help>
            <FieldErr msg={state.fieldErrors?.refCode} />
          </div>
          <div className="a-field a-studio-span-2">
            <Label htmlFor="admin-editor-slug" req hint="utilisé dans l’URL">
              Slug
            </Label>
            <div className="a-lesson-affix">
              <span aria-hidden="true">/</span>
              <input
                id="admin-editor-slug"
                name="slug"
                type="text"
                required
                minLength={LESSON_LIMITS.slugMin}
                maxLength={LESSON_LIMITS.slugMax}
                pattern={LESSON_SLUG_PATTERN}
                title={LESSON_SLUG_HINT}
                placeholder="introduction-au-sujet"
                className="a-input"
              />
            </div>
            <Help>
              {lessonUrlPrefix.replace(/^https?:\/\//u, "")}
              <b>votre-slug</b>
            </Help>
            <FieldErr msg={state.fieldErrors?.slug} />
          </div>

          {/* Title */}
          <div className="a-field a-studio-span-full">
            <Label
              htmlFor="admin-editor-title"
              req
              hint={`${String(LESSON_LIMITS.titleMin)}–${String(LESSON_LIMITS.titleMax)} caractères`}
            >
              Titre
            </Label>
            <input
              id="admin-editor-title"
              name="title"
              type="text"
              required
              minLength={LESSON_LIMITS.titleMin}
              maxLength={LESSON_LIMITS.titleMax}
              placeholder="Titre de la leçon"
              className="a-input"
            />
            <FieldErr msg={state.fieldErrors?.title} />
          </div>

          {/* Description */}
          <div className="a-field a-studio-span-full">
            <Label
              htmlFor="admin-editor-description"
              req
              hint={`${String(LESSON_LIMITS.descriptionMin)}–${String(LESSON_LIMITS.descriptionMax)} caractères · affichée dans le catalogue`}
            >
              Description
            </Label>
            <textarea
              id="admin-editor-description"
              name="description"
              required
              minLength={LESSON_LIMITS.descriptionMin}
              maxLength={LESSON_LIMITS.descriptionMax}
              rows={3}
              placeholder="Description complète de la leçon…"
              className="a-textarea"
              style={{ minHeight: 90 }}
            />
            <FieldErr msg={state.fieldErrors?.description} />
          </div>

          {/* Category, difficulty, duration, XP: one line where there is room */}
          <div className="a-field">
            <Label htmlFor="admin-editor-category" req>
              Catégorie
            </Label>
            <Select
              placeholder="Choisir…"
              id="admin-editor-category"
              name="category"
              required
              defaultValue=""
              options={[
                { value: "CYBERSEC", label: "Cybersécurité" },
                { value: "NETWORK", label: "Réseau" },
                { value: "DEV", label: "Développement" },
              ]}
            />
            <FieldErr msg={state.fieldErrors?.category} />
          </div>
          <div className="a-field">
            <Label htmlFor="admin-editor-difficulty" req>
              Difficulté
            </Label>
            <Select
              placeholder="Choisir…"
              id="admin-editor-difficulty"
              name="difficulty"
              required
              defaultValue=""
              options={[
                { value: "BEGINNER", label: "◆ ◇ ◇ ◇ Débutant" },
                { value: "INTERMEDIATE", label: "◆ ◆ ◇ ◇ Intermédiaire" },
                { value: "ADVANCED", label: "◆ ◆ ◆ ◇ Avancé" },
                { value: "EXPERT", label: "◆ ◆ ◆ ◆ Expert" },
              ]}
            />
            <FieldErr msg={state.fieldErrors?.difficulty} />
          </div>
          <div className="a-field">
            <Label htmlFor="admin-editor-estimatedMinutes" req>
              Durée estimée
            </Label>
            <div className="a-lesson-affix">
              <input
                id="admin-editor-estimatedMinutes"
                name="estimatedMinutes"
                type="number"
                required
                min={1}
                max={LESSON_LIMITS.minutesMax}
                defaultValue="20"
                className="a-input"
              />
              <span>min</span>
            </div>
            <Help>
              Médiane catalogue · <b>15 min</b>
            </Help>
          </div>
          <div className="a-field">
            <Label htmlFor="admin-editor-xpReward" req>
              Récompense XP
            </Label>
            <div className="a-lesson-affix">
              <input
                id="admin-editor-xpReward"
                name="xpReward"
                type="number"
                required
                min={0}
                max={LESSON_LIMITS.xpMax}
                step={10}
                defaultValue="100"
                className="a-input"
              />
              <span>XP</span>
            </div>
            <Help>
              Recommandé · <b>100–200 XP</b> pour intermédiaire
            </Help>
          </div>

          {/* Cover image */}
          <div className="a-field a-studio-span-full">
            <Label hint="bucket privé · URL signée">Image de couverture</Label>
            <CoverUploadField initialMarker={null} initialPreview={null} />
          </div>
        </div>

        {/* MDX Editor - blocks or Monaco, the site's preview beside it or behind a tab */}
        <div className="a-field">
          <Label req hint="blocs ou MDX · aperçu du site">
            Contenu MDX
          </Label>
          <MdxEditorPanel
            value={mdx}
            onChange={setMdx}
            preview={preview}
            problems={state.problems}
          />
          <FieldErr msg={state.fieldErrors?.contentMdx} />
        </div>

        {/* Publish toggle */}
        <label className="a-lesson-publish">
          <input name="publishNow" type="checkbox" value="true" />
          <div>
            <div className="a-lesson-publish-title">
              Publier immédiatement
              <span className="a-lesson-publish-live">en ligne</span>
            </div>
            <p className="a-field-hint" style={{ margin: 0 }}>
              La leçon sera visible dans le catalogue dès sa création. Sinon elle reste en
              brouillon.
            </p>
          </div>
        </label>

        {/* Actions */}
        <div className="a-lesson-actions">
          <Link href="/lessons" className="a-btn a-btn--ghost">
            Annuler
          </Link>
          <button type="submit" disabled={isPending} className="a-btn a-btn--primary">
            {isPending ? "Création…" : "Créer la leçon"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </>
  );
}
