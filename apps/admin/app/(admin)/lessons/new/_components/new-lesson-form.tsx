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

// ── Design tokens ─────────────────────────────────────────────────────────────

const BORDER = "var(--a-border-2)";
const DANGER = "var(--a-danger)";
const TURQ = "var(--a-accent)";
const MONO = "var(--font-sans)";
const BODY_F = "var(--font-sans)";

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

// ── Shared input styles ───────────────────────────────────────────────────────

const BASE_INPUT: React.CSSProperties = {
  width: "100%",
  background: "var(--a-surface)",
  border: `1px solid ${BORDER}`,
  color: "var(--a-fg)",
  fontFamily: MONO,
  fontSize: 13,
  letterSpacing: "0.01em",
  padding: "12px 14px",
  outline: "none",
  boxSizing: "border-box",
};

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
    <label
      htmlFor={htmlFor}
      style={{
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 12,
        color: "var(--a-fg-2)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
      {req && <span style={{ color: "var(--a-danger)", fontWeight: 700 }}>*</span>}
      {hint && (
        <span
          style={{
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "none",
            fontSize: 10.5,
            color: "var(--a-muted)",
            marginLeft: "auto",
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--a-muted)" }}>{children}</span>
  );
}

function FieldErr({ msg }: { msg?: string | undefined }) {
  return msg ? (
    <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--a-danger)", marginTop: 2 }}>
      {msg}
    </span>
  ) : null;
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
        <div
          style={{
            padding: "13px 16px",
            background: "color-mix(in srgb, var(--a-danger) 8%, transparent)",
            border: "1px solid var(--a-danger)",
            borderLeft: `3px solid ${DANGER}`,
            fontFamily: MONO,
            fontSize: 11,
            color: "var(--a-danger)",
            marginBottom: 24,
          }}
        >
          {state.error}
        </div>
      )}

      <form action={action} onReset={keepFormInput} style={{ display: "grid", gap: 22 }}>
        {/* Hidden MDX content */}
        <input type="hidden" name="contentMdx" value={mdx} />

        {/* Paths + prerequisites: the first path names the refCode below. */}
        <div className="admin-form-grid-2" style={{ alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label hint="// le premier donne le ref code">Parcours</Label>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label hint="// leçons à suivre avant celle-ci">Prérequis</Label>
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
        </div>

        {/* Row 1: refCode + slug */}
        <div className="admin-form-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-refCode" req hint="Auto-généré, modifiable">
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
                className="le-input"
                style={BASE_INPUT}
              />
            ) : (
              <div
                style={{
                  ...BASE_INPUT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <input type="hidden" name="refCode" value={refCode} />
                <span>{refCode === "" ? "Calcul…" : refCode}</span>
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
              <b style={{ color: "var(--a-accent)" }}>
                CL-LSN-{"{NNN}"}-V{"{NN}"} ou CL-LSN-{"{PPNNN}"}-V{"{NN}"}
              </b>{" "}
              · doit être unique
            </Help>
            <FieldErr msg={state.fieldErrors?.refCode} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-slug" req hint="Utilisé dans l’URL">
              Slug
            </Label>
            <div
              className="le-prefix"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "stretch",
                background: "var(--a-surface)",
                border: `1px solid ${BORDER}`,
                transition: "all 150ms ease",
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 36,
                  fontFamily: MONO,
                  fontSize: 13,
                  color: "var(--a-muted)",
                  borderRight: `1px solid ${BORDER}`,
                  background: "var(--a-bg)",
                }}
              >
                /
              </span>
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
                className="le-input"
                style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
              />
            </div>
            <Help>
              {lessonUrlPrefix.replace(/^https?:\/\//u, "")}
              <b style={{ color: "var(--a-accent)" }}>votre-slug</b>
            </Help>
            <FieldErr msg={state.fieldErrors?.slug} />
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label
            htmlFor="admin-editor-title"
            req
            hint={`// ${String(LESSON_LIMITS.titleMin)}–${String(LESSON_LIMITS.titleMax)} caractères`}
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
            className="le-input"
            style={{ ...BASE_INPUT, fontSize: 15, padding: "14px 16px" }}
          />
          <FieldErr msg={state.fieldErrors?.title} />
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label
            htmlFor="admin-editor-description"
            req
            hint={`// ${String(LESSON_LIMITS.descriptionMin)}–${String(LESSON_LIMITS.descriptionMax)} caractères · affichée dans le catalogue`}
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
            className="le-textarea"
            style={{ ...BASE_INPUT, resize: "vertical", minHeight: 90, lineHeight: 1.55 }}
          />
          <FieldErr msg={state.fieldErrors?.description} />
        </div>

        {/* Category + Difficulty */}
        <div className="admin-form-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-category" req>
              Catégorie
            </Label>
            <div style={{ position: "relative" }}>
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
            </div>
            <FieldErr msg={state.fieldErrors?.category} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-difficulty" req>
              Difficulté
            </Label>
            <div style={{ position: "relative" }}>
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
            </div>
            <FieldErr msg={state.fieldErrors?.difficulty} />
          </div>
        </div>

        {/* Duration + XP */}
        <div className="admin-form-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-estimatedMinutes" req>
              Durée estimée (minutes)
            </Label>
            <div
              className="le-num"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "stretch",
                background: "var(--a-surface)",
                border: `1px solid ${BORDER}`,
                transition: "all 150ms ease",
              }}
            >
              <input
                id="admin-editor-estimatedMinutes"
                name="estimatedMinutes"
                type="number"
                required
                min={1}
                max={LESSON_LIMITS.minutesMax}
                defaultValue="20"
                className="le-input"
                style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
              />
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: "0 14px",
                  fontFamily: MONO,
                  fontSize: 10.5,
                  letterSpacing: "0.18em",
                  color: "var(--a-muted)",
                  borderLeft: `1px solid ${BORDER}`,
                  background: "var(--a-bg)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                MIN
              </span>
            </div>
            <Help>
              Médiane catalogue · <b style={{ color: "var(--a-accent)" }}>15 min</b>
            </Help>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-xpReward" req>
              Récompense XP
            </Label>
            <div
              className="le-num"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "stretch",
                background: "var(--a-surface)",
                border: `1px solid ${BORDER}`,
                transition: "all 150ms ease",
              }}
            >
              <input
                id="admin-editor-xpReward"
                name="xpReward"
                type="number"
                required
                min={0}
                max={LESSON_LIMITS.xpMax}
                step={10}
                defaultValue="100"
                className="le-input"
                style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
              />
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: "0 14px",
                  fontFamily: MONO,
                  fontSize: 10.5,
                  letterSpacing: "0.18em",
                  color: "var(--a-muted)",
                  borderLeft: `1px solid ${BORDER}`,
                  background: "var(--a-bg)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                XP
              </span>
            </div>
            <Help>
              Recommandé · <b style={{ color: "var(--a-accent)" }}>100–200 XP</b> pour intermédiaire
            </Help>
          </div>
        </div>

        {/* Cover image */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label hint="// bucket privé · URL signée">Image de couverture</Label>
          <CoverUploadField initialMarker={null} initialPreview={null} />
        </div>

        {/* MDX Editor - Monaco + toolbar + split preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label req hint="// blocs ou MDX · aperçu du site">
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
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "16px 18px",
            background: "var(--a-surface)",
            border: `1px solid ${BORDER}`,
            cursor: "pointer",
            transition: "border-color 150ms ease",
          }}
        >
          <input
            name="publishNow"
            type="checkbox"
            value="true"
            style={{
              width: 18,
              height: 18,
              accentColor: "var(--a-accent)",
              cursor: "pointer",
              marginTop: 1,
            }}
          />
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--a-fg)",
                marginBottom: 4,
              }}
            >
              Publier immédiatement
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 700,
                  fontSize: 10,
                  color: "var(--a-accent)",
                  marginLeft: 8,
                  letterSpacing: "0.12em",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: TURQ,
                    boxShadow: `0 0 6px ${TURQ}`,
                    display: "inline-block",
                  }}
                />
                live
              </span>
            </div>
            <p
              style={{
                fontFamily: BODY_F,
                fontSize: 12.5,
                color: "var(--a-muted)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              La leçon sera visible dans le catalogue dès sa création. Sinon elle reste en
              brouillon.
            </p>
          </div>
        </label>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            paddingTop: 24,
            borderTop: "1px solid var(--a-border-2)",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Link
            href="/lessons"
            className="adm-btn-ghost"
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "13px 22px",
              background: "transparent",
              color: "var(--a-muted)",
              border: `1px solid ${BORDER}`,
              transition: "all 150ms ease",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 12,
              padding: "13px 22px",
              background: "var(--a-accent)",
              color: "var(--a-ink)",
              border: 0,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Création…" : "Créer la leçon"}
            <span style={{ fontWeight: 400 }}>→</span>
          </button>
        </div>
      </form>
    </>
  );
}
