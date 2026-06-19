"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  createLessonAction,
  getNextRefCodeAction,
  type CreateLessonState,
} from "../_actions/lesson-actions";
import { MdxEditorPanel } from "./_components/MdxEditorPanel";
import { CoverUploadField } from "../_components/cover-upload-field";

export const dynamic = "force-dynamic";

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
            color: "#44406B",
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
    <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.04em", color: "#44406B" }}>
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

export default function NewLessonPage(): React.ReactElement {
  const [state, action, isPending] = useActionState(createLessonAction, initialState);
  const [mdx, setMdx] = useState(MDX_STARTER);
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    getNextRefCodeAction()
      .then(({ nextRefCode }) => {
        setRefCode(nextRefCode);
      })
      .catch(() => {
        // Leave field empty so admin can type manually
      });
  }, []);

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
        .adm-btn-ghost:hover{color:#F5F5FA!important;border-color:#6B6890!important;background:rgba(255,255,255,0.03)!important}
      `}</style>

      <div className="admin-page-content" style={{ maxWidth: 1100 }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#6B6890",
            marginBottom: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: TURQ }}>$</span>
          <b style={{ color: "#B8B5D1", fontWeight: 500 }}>~/admin</b>
          <span style={{ color: "#44406B" }}>/</span>
          <span>leçons</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span
            style={{ color: DANGER, fontWeight: 700, textShadow: "0 0 8px rgba(255,77,109,0.4)" }}
          >
            nouvelle
          </span>
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
            Créer une <em style={{ fontStyle: "normal", color: TURQ }}>leçon</em>
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: MONO,
              fontSize: 11,
              color: "#6B6890",
              letterSpacing: "0.08em",
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#FFB547" }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FFB547",
                  display: "inline-block",
                  animation: "adm-pulse 2s infinite",
                }}
              />
              Brouillon · non publié
            </span>
            <span>·</span>
            <span>
              Auto-save toutes les <b style={{ color: "#B8B5D1" }}>10 s</b>
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
          {/* Hidden MDX content */}
          <input type="hidden" name="contentMdx" value={mdx} />

          {/* Row 1: refCode + slug */}
          <div className="admin-form-grid-2">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label req hint="// auto-généré, modifiable">
                Ref code
              </Label>
              <input
                name="refCode"
                type="text"
                required
                placeholder="CL-LSN-001-V01"
                value={refCode}
                onChange={(e) => {
                  setRefCode(e.target.value);
                }}
                className="le-input"
                style={BASE_INPUT}
              />
              <Help>
                Format :{" "}
                <b style={{ color: TURQ }}>
                  CL-LSN-{"{NNN}"}-V{"{NN}"}
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
                    color: "#6B6890",
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
                  placeholder="introduction-au-sujet"
                  className="le-input"
                  style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
                />
              </div>
              <Help>
                cyberlearn.app/leçons/<b style={{ color: TURQ }}>votre-slug</b>
              </Help>
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
              placeholder="Titre de la leçon"
              className="le-input"
              style={{ ...BASE_INPUT, fontSize: 15, padding: "14px 16px" }}
            />
            <FieldErr msg={state.fieldErrors?.title} />
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req hint="// 10–1000 caractères · affichée dans le catalogue">
              Description
            </Label>
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={1000}
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
                <select
                  name="category"
                  required
                  defaultValue=""
                  className="le-select"
                  style={{
                    ...BASE_INPUT,
                    paddingRight: 38,
                    cursor: "pointer",
                    appearance: "none" as const,
                  }}
                >
                  <option value="" disabled style={{ background: "#0A0826" }}>
                    Choisir…
                  </option>
                  <option value="CYBERSEC" style={{ background: "#0A0826" }}>
                    Cybersécurité
                  </option>
                  <option value="NETWORK" style={{ background: "#0A0826" }}>
                    Réseau
                  </option>
                  <option value="DEV" style={{ background: "#0A0826" }}>
                    Développement
                  </option>
                </select>
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    width: 7,
                    height: 7,
                    borderRight: `1.5px solid #6B6890`,
                    borderBottom: `1.5px solid #6B6890`,
                    transform: "translateY(-70%) rotate(45deg)",
                    pointerEvents: "none",
                  }}
                />
              </div>
              <FieldErr msg={state.fieldErrors?.category} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label req>Difficulté</Label>
              <div style={{ position: "relative" }}>
                <select
                  name="difficulty"
                  required
                  defaultValue=""
                  className="le-select"
                  style={{
                    ...BASE_INPUT,
                    paddingRight: 38,
                    cursor: "pointer",
                    appearance: "none" as const,
                  }}
                >
                  <option value="" disabled style={{ background: "#0A0826" }}>
                    Choisir…
                  </option>
                  <option value="BEGINNER" style={{ background: "#0A0826" }}>
                    ◆ ◇ ◇ ◇ Débutant
                  </option>
                  <option value="INTERMEDIATE" style={{ background: "#0A0826" }}>
                    ◆ ◆ ◇ ◇ Intermédiaire
                  </option>
                  <option value="ADVANCED" style={{ background: "#0A0826" }}>
                    ◆ ◆ ◆ ◇ Avancé
                  </option>
                  <option value="EXPERT" style={{ background: "#0A0826" }}>
                    ◆ ◆ ◆ ◆ Expert
                  </option>
                </select>
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    width: 7,
                    height: 7,
                    borderRight: `1.5px solid #6B6890`,
                    borderBottom: `1.5px solid #6B6890`,
                    transform: "translateY(-70%) rotate(45deg)",
                    pointerEvents: "none",
                  }}
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
                    color: "#6B6890",
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
                  max={5000}
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
                    color: "#6B6890",
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
            <Label req hint="// Monaco · MDX · split preview">
              Contenu MDX
            </Label>
            <MdxEditorPanel value={mdx} onChange={setMdx} />
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
                  color: "#6B6890",
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
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10.5,
                color: "#44406B",
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
                  color: "#6B6890",
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
                  color: "#6B6890",
                  margin: "0 1px",
                }}
              >
                S
              </kbd>{" "}
              sauvegarder ·{" "}
              <kbd
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: "1px 6px",
                  border: `1px solid ${BORDER}`,
                  background: "#0A0826",
                  color: "#6B6890",
                  margin: "0 1px",
                }}
              >
                esc
              </kbd>{" "}
              annuler
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
                color: "#6B6890",
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
      </div>
    </>
  );
}
