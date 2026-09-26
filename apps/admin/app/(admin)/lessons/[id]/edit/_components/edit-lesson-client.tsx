"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { MdxEditorPanel } from "@cyberlearn/ui/mdx-editor";
import { CoverUploadField } from "../../../_components/cover-upload-field";
import { updateLessonAction, type UpdateLessonState } from "../actions";
import { Select } from "@cyberlearn/ui";

// ── Design tokens ──────────────────────────────────────────────────────────────

const BORDER = "#2A2560";
const DANGER = "#FF4D6D";
const TURQ = "#0AFFD4";
const MONO = "var(--font-mono)";
const BODY_F = "var(--font-sans)";

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

// ── Sub-components ─────────────────────────────────────────────────────────────

function Label({
  children,
  hint,
  req,
}: { children: React.ReactNode; hint?: string; req?: boolean }) {
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
}: {
  lesson: LessonData;
  coverPreview: string | null;
}): React.ReactElement {
  const boundAction = updateLessonAction.bind(null, lesson.id);
  const [state, action, isPending] = useActionState(boundAction, initialState);
  const [mdx, setMdx] = useState(lesson.contentMdx);

  const statusColor: Record<string, string> = {
    DRAFT: "#FFB547",
    PUBLISHED: "#0AFFD4",
    ARCHIVED: "#FF4757",
  };

  return (
    <>
      <style>{`
        @keyframes adm-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
        @keyframes adm-pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @media(prefers-reduced-motion:reduce){.adm-caret{animation:none!important}}
        .le-input:hover,.le-select:hover,.le-textarea:hover{border-color:rgba(255,255,255,0.18)!important}
        .le-input:focus,.le-select:focus,.le-textarea:focus{border-color:${TURQ}!important;background:#0E0A33!important;box-shadow:0 0 0 1px rgba(10,255,212,0.25),inset 0 0 0 1px rgba(10,255,212,0.08)!important}
        .le-prefix:focus-within{border-color:${TURQ}!important;background:#0E0A33!important;box-shadow:0 0 0 1px rgba(10,255,212,0.25)!important}
        .le-num:focus-within{border-color:${TURQ}!important;background:#0E0A33!important;box-shadow:0 0 0 1px rgba(10,255,212,0.25)!important}
        .adm-btn-ghost:hover{color:#F5F5FA!important;border-color:#7F7BA9!important;background:rgba(255,255,255,0.03)!important}
      `}</style>

      <div className="admin-page-content" style={{ maxWidth: 1100 }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#7F7BA9",
            marginBottom: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: TURQ }}>$</span>
          <b style={{ color: "#B8B5D1", fontWeight: 500 }}>~/admin</b>
          <span style={{ color: "#7F7BA9" }}>/</span>
          <Link href="/lessons" style={{ color: "#7F7BA9", textDecoration: "none" }}>
            leçons
          </Link>
          <span style={{ color: "#7F7BA9" }}>/</span>
          <span style={{ color: TURQ, fontWeight: 700 }}>éditer</span>
          <span
            className="adm-caret"
            style={{
              display: "inline-block",
              width: 7,
              height: 13,
              background: TURQ,
              boxShadow: `0 0 8px ${TURQ}`,
              marginLeft: 4,
              verticalAlign: -2,
              animation: "adm-blink 1s step-end infinite",
            }}
          />
        </div>

        {/* Head */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: BODY_F,
              fontSize: 28,
              fontWeight: 700,
              color: "#F5F5FA",
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            Éditer la <em style={{ fontStyle: "normal", color: TURQ }}>leçon</em>
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: MONO,
              fontSize: 11,
              color: "#7F7BA9",
              letterSpacing: "0.08em",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#4D8BFF" }}>
              {lesson.refCode}
            </span>
            <span>·</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: statusColor[lesson.status] ?? "#7F7BA9",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusColor[lesson.status] ?? "#7F7BA9",
                  display: "inline-block",
                  animation: "adm-pulse 2s infinite",
                }}
              />
              {lesson.status === "DRAFT"
                ? "Brouillon"
                : lesson.status === "PUBLISHED"
                  ? "Publié"
                  : "Archivé"}
            </span>
          </div>
        </div>

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

        <form action={action} style={{ display: "grid", gap: 22 }}>
          <input type="hidden" name="contentMdx" value={mdx} />

          {/* Row 1: refCode + slug */}
          <div className="admin-form-grid-2">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label req hint="// doit être unique">
                Ref code
              </Label>
              <input
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
                  CL-LSN-{"{NNN}"}-V{"{NN}"}
                </b>
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
                  defaultValue={lesson.slug}
                  placeholder="mon-slug"
                  className="le-input"
                  style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
                />
              </div>
              <FieldErr msg={state.fieldErrors?.slug} />
            </div>
          </div>

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req hint="// 3–200 caractères">
              Titre
            </Label>
            <input
              name="title"
              type="text"
              required
              maxLength={200}
              defaultValue={lesson.title}
              className="le-input"
              style={{ ...BASE_INPUT, fontSize: 15, padding: "14px 16px" }}
            />
            <FieldErr msg={state.fieldErrors?.title} />
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req hint="// 10–500 caractères">
              Description
            </Label>
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={500}
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
              <Label req>Catégorie</Label>
              <div style={{ position: "relative" }}>
                <Select
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
              <Label req>Difficulté</Label>
              <div style={{ position: "relative" }}>
                <Select
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
                  max={480}
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
                  max={5000}
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
            </div>
          </div>

          {/* Cover image */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label hint="// bucket privé · URL signée">Image de couverture</Label>
            <CoverUploadField initialMarker={lesson.coverImageUrl} initialPreview={coverPreview} />
          </div>

          {/* MDX Editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req hint="// Monaco · MDX · split preview">
              Contenu MDX
            </Label>
            <MdxEditorPanel value={mdx} onChange={setMdx} />
            <FieldErr msg={state.fieldErrors?.contentMdx} />
          </div>

          {/* Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req>Statut</Label>
            <div style={{ position: "relative", maxWidth: 280 }}>
              <Select
                name="status"
                required
                defaultValue={lesson.status}
                options={[
                  { value: "DRAFT", label: "Brouillon" },
                  { value: "PUBLISHED", label: "Publié" },
                  { value: "ARCHIVED", label: "Archivé" },
                ]}
              />
            </div>
            <Help>
              Passer à <b style={{ color: TURQ }}>Publié</b> rend la leçon visible dans le
              catalogue.
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
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10.5,
                color: "#7F7BA9",
                letterSpacing: "0.06em",
                marginRight: "auto",
              }}
            >
              <kbd
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: "1px 6px",
                  border: `1px solid ${BORDER}`,
                  background: "#0A0826",
                  color: "#7F7BA9",
                  margin: "0 1px",
                }}
              >
                ⌘
              </kbd>
              <kbd
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: "1px 6px",
                  border: `1px solid ${BORDER}`,
                  background: "#0A0826",
                  color: "#7F7BA9",
                  margin: "0 1px",
                }}
              >
                S
              </kbd>{" "}
              sauvegarder
            </span>
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
              {isPending ? "Sauvegarde…" : "Sauvegarder"}
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
      </div>
    </>
  );
}
