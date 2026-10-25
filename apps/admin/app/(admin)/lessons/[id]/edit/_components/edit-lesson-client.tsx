"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { MdxEditorPanel, useLessonPreview } from "@cyberlearn/ui/mdx-editor";
import { refreshLessonPreviewAction } from "../../../_actions/preview-actions";
import { CoverUploadField } from "../../../_components/cover-upload-field";
import { CONTENT_STATUS_OPTIONS } from "../../../../_components/content-status";
import { updateLessonAction, type UpdateLessonState } from "../actions";
import { Select } from "@cyberlearn/ui";
import { keepFormInput } from "@/lib/form-input";
import { LESSON_LIMITS, LESSON_SLUG_HINT, LESSON_SLUG_PATTERN } from "@/lib/lesson-limits";

// ── Design tokens ──────────────────────────────────────────────────────────────

const BORDER = "var(--a-border-2)";
const DANGER = "var(--a-danger)";
const TURQ = "var(--a-accent)";
const MONO = "var(--font-sans)";

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

// ── Sub-components ─────────────────────────────────────────────────────────────

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
      {req && <span style={{ color: DANGER, fontWeight: 700 }}>*</span>}
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

function FieldErr({ msg }: { msg: string | undefined }) {
  return msg !== undefined ? (
    <span style={{ fontFamily: MONO, fontSize: 10, color: DANGER, marginTop: 2 }}>{msg}</span>
  ) : null;
}

// ── Lesson shape ───────────────────────────────────────────────────────────────

export interface LessonData {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  coverImageUrl: string | null;
  contentMdx: string;
  status: string;
}

// ── Main component ─────────────────────────────────────────────────────────────

const initialState: UpdateLessonState = {};

export function EditLessonClient({
  lesson,
  coverPreview,
  lessonUrlPrefix,
}: {
  lesson: LessonData;
  coverPreview: string | null;
  /** The lesson's address on the learner site, up to the slug. */
  lessonUrlPrefix: string;
}): React.ReactElement {
  const boundAction = updateLessonAction.bind(null, lesson.id);
  const [state, action, isPending] = useActionState(boundAction, initialState);
  const [mdx, setMdx] = useState(lesson.contentMdx);
  // Controlled, so the address under the field follows what is typed rather
  // than the slug the lesson had when the page loaded.
  const [slug, setSlug] = useState(lesson.slug);
  const preview = useLessonPreview(refreshLessonPreviewAction);

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
            color: DANGER,
            marginBottom: 24,
          }}
        >
          {state.error}
        </div>
      )}

      <form action={action} onReset={keepFormInput} style={{ display: "grid", gap: 22 }}>
        <input type="hidden" name="contentMdx" value={mdx} />

        {/* Row 1: refCode + slug */}
        <div className="admin-form-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-refCode" req hint="Doit être unique">
              Ref code
            </Label>
            <input
              id="admin-editor-refCode"
              name="refCode"
              type="text"
              required
              defaultValue={lesson.refCode}
              placeholder="CL-LSN-001-V01"
              className="le-input"
              style={BASE_INPUT}
            />
            <Help>
              Format :{" "}
              <b style={{ color: TURQ }}>
                CL-LSN-{"{NNN}"}-V{"{NN}"} ou CL-LSN-{"{PPNNN}"}-V{"{NN}"}
              </b>
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
                  background: "rgba(0,0,0,0.25)",
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
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                }}
                placeholder="mon-slug"
                className="le-input"
                style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
              />
            </div>
            <Help>
              {lessonUrlPrefix.replace(/^https?:\/\//u, "")}
              <b style={{ color: TURQ }}>{slug}</b>
            </Help>
            <FieldErr msg={state.fieldErrors?.slug} />
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label
            req
            htmlFor="admin-editor-title"
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
            defaultValue={lesson.title}
            className="le-input"
            style={{ ...BASE_INPUT, fontSize: 15, padding: "14px 16px" }}
          />
          <FieldErr msg={state.fieldErrors?.title} />
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label
            req
            htmlFor="admin-editor-description"
            hint={`// ${String(LESSON_LIMITS.descriptionMin)}–${String(LESSON_LIMITS.descriptionMax)} caractères`}
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
            defaultValue={lesson.description}
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
                id="admin-editor-category"
                name="category"
                required
                defaultValue={lesson.category}
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
                id="admin-editor-difficulty"
                name="difficulty"
                required
                defaultValue={lesson.difficulty}
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
                defaultValue={lesson.estimatedMinutes}
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
                  background: "rgba(0,0,0,0.25)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                MIN
              </span>
            </div>
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
                defaultValue={lesson.xpReward}
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
                  background: "rgba(0,0,0,0.25)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                XP
              </span>
            </div>
          </div>
        </div>

        {/* Cover image */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label hint="// bucket privé · URL signée">Image de couverture</Label>
          <CoverUploadField initialMarker={lesson.coverImageUrl} initialPreview={coverPreview} />
        </div>

        {/* MDX Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label req hint="// blocs ou MDX · aperçu du site">
            Contenu MDX
          </Label>
          <MdxEditorPanel value={mdx} onChange={setMdx} preview={preview} />
          <FieldErr msg={state.fieldErrors?.contentMdx} />
        </div>

        {/* Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label htmlFor="admin-editor-status" req>
            Statut
          </Label>
          <div style={{ position: "relative", maxWidth: 280 }}>
            <Select
              id="admin-editor-status"
              name="status"
              required
              defaultValue={lesson.status}
              options={CONTENT_STATUS_OPTIONS}
            />
          </div>
          <Help>
            Passer à <b style={{ color: TURQ }}>Publié</b> rend la leçon visible dans le catalogue.
          </Help>
        </div>

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
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "13px 22px",
              background: "var(--a-accent)",
              color: "var(--a-ink)",
              border: 0,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Sauvegarde…" : "Sauvegarder"}
            <span style={{ fontWeight: 400 }}>→</span>
          </button>
        </div>
      </form>
    </>
  );
}
