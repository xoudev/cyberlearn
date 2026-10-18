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

const BORDER = "#2A2560";
const DANGER = "#FF4D6D";
const TURQ = "#0AFFD4";
const MONO = "var(--font-mono)";
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
  background: "#0A0826",
  border: `1px solid ${BORDER}`,
  color: "#F5F5FA",
  fontFamily: MONO,
  fontSize: 13,
  letterSpacing: "0.01em",
  padding: "12px 14px",
  outline: "none",
  boxSizing: "border-box",
};

function Label({
  children,
  hint,
  req,
}: {
  children: React.ReactNode;
  hint?: string;
  req?: boolean;
}) {
  return (
    <label
      style={{
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 10.5,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#B8B5D1",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
      {req && <span style={{ color: DANGER, fontWeight: 700 }}>*</span>}
      {hint && (
        <span
          style={{
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "none",
            fontSize: 10.5,
            color: "#7F7BA9",
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
    <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.04em", color: "#7F7BA9" }}>
      {children}
    </span>
  );
}

function FieldErr({ msg }: { msg?: string | undefined }) {
  return msg ? (
    <span style={{ fontFamily: MONO, fontSize: 10, color: DANGER, marginTop: 2 }}>{msg}</span>
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
      <style>{`
        .le-input:hover,.le-select:hover,.le-textarea:hover{border-color:rgba(255,255,255,0.18)!important}
        .le-input:focus,.le-select:focus,.le-textarea:focus{border-color:${TURQ}!important;background:#0E0A33!important;box-shadow:0 0 0 1px rgba(10,255,212,0.25),inset 0 0 0 1px rgba(10,255,212,0.08)!important}
        .le-prefix:focus-within{border-color:${TURQ}!important;background:#0E0A33!important;box-shadow:0 0 0 1px rgba(10,255,212,0.25)!important}
        .le-num:focus-within{border-color:${TURQ}!important;background:#0E0A33!important;box-shadow:0 0 0 1px rgba(10,255,212,0.25)!important}
        .adm-btn-ghost:hover{color:#F5F5FA!important;border-color:#7F7BA9!important;background:rgba(255,255,255,0.03)!important}
      `}</style>

      {/* Global error */}
      {state.error && (
        <div
          style={{
            padding: "13px 16px",
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.35)",
            borderLeft: `3px solid ${DANGER}`,
            fontFamily: MONO,
            fontSize: 11,
            color: DANGER,
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
            <Label req hint="// auto-généré, modifiable">
              Ref code
            </Label>
            {refCodeOpen ? (
              <input
                name="refCode"
                type="text"
                required
                placeholder="CL-LSN-01001-V01"
                value={refCode}
                onChange={(e) => {
                  setRefCode(e.target.value);
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
                  padding: "6px 6px 6px 14px",
                }}
              >
                <input type="hidden" name="refCode" value={refCode} />
                <span style={{ color: refCode === "" ? "#7F7BA9" : undefined }}>
                  {refCode === "" ? "Calcul…" : refCode}
                </span>
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
                  Tiré du parcours <b style={{ color: TURQ }}>{firstPath.title}</b> et du rang que
                  la leçon y prendra, bilans de module non comptés.
                </>
              ) : (
                <>Le prochain code libre du catalogue, faute de parcours.</>
              )}
            </Help>
            <Help>
              Format :{" "}
              <b style={{ color: TURQ }}>
                CL-LSN-{"{NNN}"}-V{"{NN}"} ou CL-LSN-{"{PPNNN}"}-V{"{NN}"}
              </b>{" "}
              · doit être unique
            </Help>
            <FieldErr msg={state.fieldErrors?.refCode} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req hint="// utilisé dans l'URL">
              Slug
            </Label>
            <div
              className="le-prefix"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "stretch",
                background: "#0A0826",
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
                  color: "#7F7BA9",
                  borderRight: `1px solid ${BORDER}`,
                  background: "rgba(0,0,0,0.25)",
                }}
              >
                /
              </span>
              <input
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
              <b style={{ color: TURQ }}>votre-slug</b>
            </Help>
            <FieldErr msg={state.fieldErrors?.slug} />
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label
            req
            hint={`// ${String(LESSON_LIMITS.titleMin)}–${String(LESSON_LIMITS.titleMax)} caractères`}
          >
            Titre
          </Label>
          <input
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
            req
            hint={`// ${String(LESSON_LIMITS.descriptionMin)}–${String(LESSON_LIMITS.descriptionMax)} caractères · affichée dans le catalogue`}
          >
            Description
          </Label>
          <textarea
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
            <Label req>Catégorie</Label>
            <div style={{ position: "relative" }}>
              <Select
                placeholder="Choisir…"
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
            <Label req>Difficulté</Label>
            <div style={{ position: "relative" }}>
              <Select
                placeholder="Choisir…"
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
            <Label req>Durée estimée (minutes)</Label>
            <div
              className="le-num"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "stretch",
                background: "#0A0826",
                border: `1px solid ${BORDER}`,
                transition: "all 150ms ease",
              }}
            >
              <input
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
                  color: "#7F7BA9",
                  borderLeft: `1px solid ${BORDER}`,
                  background: "rgba(0,0,0,0.25)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                MIN
              </span>
            </div>
            <Help>
              Médiane catalogue · <b style={{ color: TURQ }}>15 min</b>
            </Help>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req>Récompense XP</Label>
            <div
              className="le-num"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "stretch",
                background: "#0A0826",
                border: `1px solid ${BORDER}`,
                transition: "all 150ms ease",
              }}
            >
              <input
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
                  color: "#7F7BA9",
                  borderLeft: `1px solid ${BORDER}`,
                  background: "rgba(0,0,0,0.25)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                XP
              </span>
            </div>
            <Help>
              Recommandé · <b style={{ color: TURQ }}>100–200 XP</b> pour intermédiaire
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
          <MdxEditorPanel value={mdx} onChange={setMdx} preview={preview} />
          <FieldErr msg={state.fieldErrors?.contentMdx} />
        </div>

        {/* Publish toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "16px 18px",
            background: "#0A0826",
            border: `1px solid ${BORDER}`,
            cursor: "pointer",
            transition: "border-color 150ms ease",
          }}
        >
          <input
            name="publishNow"
            type="checkbox"
            value="true"
            style={{ width: 18, height: 18, accentColor: TURQ, cursor: "pointer", marginTop: 1 }}
          />
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#F5F5FA",
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
                  color: TURQ,
                  marginLeft: 8,
                  letterSpacing: "0.12em",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
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
                color: "#7F7BA9",
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
            borderTop: `1px solid ${BORDER}`,
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
              color: "#7F7BA9",
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
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "13px 22px",
              background: "linear-gradient(135deg, #2848FF, #0024FF)",
              color: "#fff",
              border: 0,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
              boxShadow: "0 0 24px rgba(40,72,255,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -3,
                left: -3,
                width: 10,
                height: 10,
                border: "1.5px solid #fff",
                borderRight: 0,
                borderBottom: 0,
                opacity: 0.7,
              }}
            />
            {isPending ? "Création…" : "Créer la leçon"}
            <span style={{ fontWeight: 400 }}>→</span>
            <span
              style={{
                position: "absolute",
                bottom: -3,
                right: -3,
                width: 10,
                height: 10,
                border: "1.5px solid #fff",
                borderTop: 0,
                borderLeft: 0,
                opacity: 0.7,
              }}
            />
          </button>
        </div>
      </form>
    </>
  );
}
