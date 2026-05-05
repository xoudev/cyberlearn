"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { createPathAction, type CreatePathState } from "../../_actions/path-actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvailableLesson {
  id: string;
  refCode: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_CHIPS: Record<string, { color: string; border: string }> = {
  CYBERSEC: { color: "#FF6B9D", border: "rgba(255,107,157,0.3)" },
  NETWORK: { color: "#6E8BFF", border: "rgba(110,139,255,0.35)" },
  DEV: { color: TURQ, border: `rgba(10,255,212,0.3)` },
};
const DIFF_DIAMONDS: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

function diamonds(difficulty: string): React.ReactElement {
  const n = DIFF_DIAMONDS[difficulty] ?? 1;
  return (
    <span style={{ letterSpacing: "-0.05em", color: "#6B6890" }}>
      {"◆".repeat(n)}
      <span style={{ color: "#44406B" }}>{"◇".repeat(4 - n)}</span>
    </span>
  );
}

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
      {req && <span style={{ color: DANGER }}>*</span>}
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
  return <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#44406B" }}>{children}</span>;
}
function FieldErr({ msg }: { msg?: string | undefined }) {
  return msg ? <span style={{ fontFamily: MONO, fontSize: 10, color: DANGER }}>{msg}</span> : null;
}

// ── Drag-and-drop lesson row ──────────────────────────────────────────────────

interface DragState {
  dragId: string | null;
  overId: string | null;
}

function LessonRow({
  lesson,
  idx,
  dragState,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onRemove,
}: {
  lesson: AvailableLesson;
  idx: number;
  dragState: DragState;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onRemove: (id: string) => void;
}) {
  const isDragging = dragState.dragId === lesson.id;
  const isDropTarget =
    dragState.overId === lesson.id && dragState.dragId !== null && dragState.dragId !== lesson.id;
  const cat = CAT_CHIPS[lesson.category] ?? { color: "#6B6890", border: "rgba(107,104,144,0.35)" };

  return (
    <li
      draggable
      onDragStart={(e) => {
        onDragStart(e, lesson.id);
      }}
      onDragOver={(e) => {
        onDragOver(e, lesson.id);
      }}
      onDrop={(e) => {
        onDrop(e, lesson.id);
      }}
      onDragEnd={onDragEnd}
      style={{
        display: "grid",
        gridTemplateColumns: "28px 36px 1fr auto auto",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px 12px 8px",
        borderBottom: `1px solid rgba(42,37,96,0.5)`,
        background: isDropTarget ? "#0E0A33" : isDragging ? "#0E0A33" : "#0A0826",
        outline: isDragging ? `1px solid ${TURQ}` : isDropTarget ? `1px dashed ${TURQ}` : "none",
        outlineOffset: -1,
        boxShadow: isDragging
          ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(10,255,212,0.25)`
          : "none",
        position: "relative",
        transition: "background 100ms ease",
        cursor: "grab",
        listStyle: "none",
      }}
    >
      {/* drop indicator */}
      {isDropTarget && (
        <span
          style={{
            position: "absolute",
            top: -1,
            left: 8,
            right: 8,
            height: 2,
            background: TURQ,
            boxShadow: `0 0 10px ${TURQ}`,
          }}
        />
      )}

      {/* handle */}
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          color: isDragging ? TURQ : "#44406B",
          transition: "color 100ms ease",
        }}
      >
        <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
          <circle cx="6" cy="3" r="1.4" />
          <circle cx="10" cy="3" r="1.4" />
          <circle cx="6" cy="8" r="1.4" />
          <circle cx="10" cy="8" r="1.4" />
          <circle cx="6" cy="13" r="1.4" />
          <circle cx="10" cy="13" r="1.4" />
        </svg>
      </span>

      {/* position */}
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.04em",
          color: idx === 0 ? TURQ : "#6B6890",
          background: "#050416",
          border: `1px solid ${idx === 0 ? "rgba(10,255,212,0.35)" : BORDER}`,
          width: 36,
          height: 28,
          display: "grid",
          placeItems: "center",
        }}
      >
        {String(idx + 1).padStart(2, "0")}
      </span>

      {/* main */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <p
          style={{
            fontFamily: BODY_F,
            fontWeight: 600,
            fontSize: 14,
            color: "#F5F5FA",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lesson.title}
        </p>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            color: "#44406B",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: TURQ }}>{lesson.refCode}</span>
          <span style={{ color: "#44406B" }}>·</span>
          {diamonds(lesson.difficulty)}
          <span style={{ color: "#44406B" }}>·</span>
          <span>
            <b style={{ color: "#6B6890" }}>{lesson.estimatedMinutes}</b> min
          </span>
        </span>
      </div>

      {/* chips */}
      <div style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
        <span
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 8px",
            border: `1px solid ${cat.border}`,
            color: cat.color,
            background: "rgba(0,0,0,0.25)",
          }}
        >
          {lesson.category === "CYBERSEC"
            ? "Cybersec"
            : lesson.category === "NETWORK"
              ? "Réseau"
              : "Dev"}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 8px",
            border: `1px solid rgba(10,255,212,0.3)`,
            color: TURQ,
            background: "rgba(10,255,212,0.05)",
          }}
        >
          +{lesson.xpReward} XP
        </span>
      </div>

      {/* remove */}
      <button
        type="button"
        onClick={() => {
          onRemove(lesson.id);
        }}
        aria-label="Retirer"
        style={{
          display: "grid",
          placeItems: "center",
          width: 30,
          height: 30,
          background: "transparent",
          border: `1px solid ${BORDER}`,
          color: "#6B6890",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
      >
        <svg
          width={11}
          height={11}
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <path d="M3 3L11 11M11 3L3 11" />
        </svg>
      </button>
    </li>
  );
}

// ── Lesson picker modal ───────────────────────────────────────────────────────

function LessonPicker({
  available,
  selected,
  onAdd,
  onClose,
}: {
  available: AvailableLesson[];
  selected: string[];
  onAdd: (l: AvailableLesson) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = available.filter(
    (l) =>
      !selected.includes(l.id) &&
      (q === "" ||
        l.title.toLowerCase().includes(q.toLowerCase()) ||
        l.refCode.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        background: "rgba(3,2,25,0.85)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(640px, 90vw)",
          background: "#0A0826",
          border: `1px solid ${BORDER}`,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: `1px solid ${BORDER}`,
            background: "#050416",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#B8B5D1",
            }}
          >
            <span style={{ color: "#44406B" }}>{"// "}</span>AJOUTER UNE LEÇON
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: 0,
              color: "#6B6890",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 13,
            }}
          >
            ✕
          </button>
        </div>
        {/* search */}
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Rechercher…"
            autoFocus
            style={{ ...BASE_INPUT, padding: "10px 14px" }}
          />
        </div>
        {/* list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                fontFamily: MONO,
                fontSize: 11,
                color: "#44406B",
              }}
            >
              Aucune leçon disponible
            </div>
          ) : (
            filtered.map((l) => {
              const cat = CAT_CHIPS[l.category] ?? {
                color: "#6B6890",
                border: "rgba(107,104,144,0.35)",
              };
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onAdd(l);
                    onClose();
                  }}
                  style={{
                    width: "100%",
                    background: "none",
                    border: 0,
                    borderBottom: `1px solid rgba(42,37,96,0.5)`,
                    padding: "12px 18px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "background 100ms ease",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: BODY_F,
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#F5F5FA",
                        margin: "0 0 3px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.title}
                    </p>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: "#44406B" }}>
                      {l.refCode} · {l.estimatedMinutes} min · +{l.xpReward} XP
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      padding: "2px 8px",
                      border: `1px solid ${cat.border}`,
                      color: cat.color,
                      flexShrink: 0,
                    }}
                  >
                    {l.category === "CYBERSEC"
                      ? "Cybersec"
                      : l.category === "NETWORK"
                        ? "Réseau"
                        : "Dev"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

const initialState: CreatePathState = {};

export function NewPathClient({
  availableLessons,
}: { availableLessons: AvailableLesson[] }): React.JSX.Element {
  const [state, action, isPending] = useActionState(createPathAction, initialState);
  const [lessons, setLessons] = useState<AvailableLesson[]>([]);
  const [dragState, setDragState] = useState<DragState>({ dragId: null, overId: null });
  const [pickerOpen, setPickerOpen] = useState(false);

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDragState({ dragId: id, overId: id });
  };
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragState.overId !== id) setDragState((s) => ({ ...s, overId: id }));
  };
  const onDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault();
    const { dragId } = dragState;
    if (!dragId || dragId === dropId) {
      setDragState({ dragId: null, overId: null });
      return;
    }
    setLessons((arr) => {
      const next = [...arr];
      const fromIdx = next.findIndex((l) => l.id === dragId);
      const toIdx = next.findIndex((l) => l.id === dropId);
      const [moved] = next.splice(fromIdx, 1);
      if (moved) next.splice(toIdx, 0, moved);
      return next;
    });
    setDragState({ dragId: null, overId: null });
  };
  const onDragEnd = () => {
    setDragState({ dragId: null, overId: null });
  };
  const onRemove = (id: string) => {
    setLessons((arr) => arr.filter((l) => l.id !== id));
  };
  const onAdd = (lesson: AvailableLesson) => {
    setLessons((arr) => [...arr, lesson]);
  };

  const totals = lessons.reduce(
    (acc, l) => ({
      count: acc.count + 1,
      dur: acc.dur + l.estimatedMinutes,
      xp: acc.xp + l.xpReward,
    }),
    { count: 0, dur: 0, xp: 0 },
  );
  const avgDiff = lessons.length
    ? (
        lessons.reduce((s, l) => s + (DIFF_DIAMONDS[l.difficulty] ?? 1), 0) / lessons.length
      ).toFixed(1)
    : "-";

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
        .pe-row:hover{background:#0E0A33!important}
        .pe-add:hover{color:${TURQ}!important;background:rgba(10,255,212,0.04)!important;border-top-color:rgba(10,255,212,0.4)!important;border-top-style:solid!important}
        .adm-btn-ghost:hover{color:#F5F5FA!important;border-color:#6B6890!important;background:rgba(255,255,255,0.03)!important}
      `}</style>

      {pickerOpen && (
        <LessonPicker
          available={availableLessons}
          selected={lessons.map((l) => l.id)}
          onAdd={onAdd}
          onClose={() => {
            setPickerOpen(false);
          }}
        />
      )}

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
          <span>parcours</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span
            style={{ color: DANGER, fontWeight: 700, textShadow: "0 0 8px rgba(255,77,109,0.4)" }}
          >
            nouveau
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
            Créer un <em style={{ fontStyle: "normal", color: TURQ }}>parcours</em>
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
              <b style={{ color: "#B8B5D1" }}>{totals.count}</b> leçons agrégées
            </span>
            <span>·</span>
            <span>Auto-save activé</span>
          </div>
        </div>

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
          {/* Hidden ordered lesson IDs */}
          <input type="hidden" name="lessonIds" value={JSON.stringify(lessons.map((l) => l.id))} />

          {/* refCode + slug */}
          <div className="admin-form-grid-2">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label req hint="// auto-généré">
                Ref code
              </Label>
              <input
                name="refCode"
                type="text"
                required
                placeholder="CL-PATH-001-V01"
                className="le-input"
                style={BASE_INPUT}
              />
              <Help>
                Format :{" "}
                <b style={{ color: TURQ }}>
                  CL-PATH-{"{NNN}"}-V{"{NN}"}
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
                  placeholder="nom-du-parcours"
                  className="le-input"
                  style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
                />
              </div>
              <Help>
                cyberlearn.app/parcours/<b style={{ color: TURQ }}>votre-slug</b>
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
              placeholder="Titre du parcours"
              className="le-input"
              style={{ ...BASE_INPUT, fontSize: 15, padding: "14px 16px" }}
            />
            <FieldErr msg={state.fieldErrors?.title} />
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label req hint="// 10–1000 caractères · affichée sur la page parcours">
              Description
            </Label>
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={1000}
              rows={5}
              placeholder="Description complète du parcours…"
              className="le-textarea"
              style={{ ...BASE_INPUT, resize: "vertical", minHeight: 120, lineHeight: 1.55 }}
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
                  <option value="DEV" style={{ background: "#0A0826" }}>
                    Développement
                  </option>
                  <option value="CYBERSEC" style={{ background: "#0A0826" }}>
                    Cybersécurité
                  </option>
                  <option value="NETWORK" style={{ background: "#0A0826" }}>
                    Réseau
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

          {/* Duration */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
            <Label req>Durée estimée (heures)</Label>
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
                name="estimatedHours"
                type="number"
                required
                min={1}
                max={500}
                defaultValue={Math.max(1, Math.round(totals.dur / 60))}
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
                H
              </span>
            </div>
            <Help>
              Calculée auto depuis les leçons :{" "}
              <b style={{ color: TURQ }}>{(totals.dur / 60).toFixed(1)} h</b> · ajuste pour pauses
            </Help>
          </div>

          {/* Cover image */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label hint="// 1280×720 recommandé">URL image de couverture</Label>
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
                ↗
              </span>
              <input
                name="coverImageUrl"
                type="url"
                placeholder="https://…"
                className="le-input"
                style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
              />
            </div>
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Publier immédiatement
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10,
                    color: TURQ,
                    fontWeight: 700,
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
                Le parcours sera visible par tous les apprenants dès sa création. Sinon il reste en
                brouillon.
              </p>
            </div>
          </label>

          {/* Lessons section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label hint="// glisse pour réordonner">Leçons du parcours</Label>
            <div style={{ border: `1px solid ${BORDER}`, background: "#0A0826" }}>
              {/* section head */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderBottom: `1px solid ${BORDER}`,
                  background: "#050416",
                }}
              >
                <h3
                  style={{
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#B8B5D1",
                    margin: 0,
                  }}
                >
                  <span style={{ color: "#44406B" }}>{"// "}</span>
                  <b style={{ color: TURQ }}>{lessons.length}</b> leçons · ordre actuel
                </h3>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#44406B" }}>
                  <b style={{ color: "#6B6890" }}>{(totals.dur / 60).toFixed(1)} h</b> total ·{" "}
                  <b style={{ color: "#6B6890" }}>{totals.xp}</b> XP cumulés
                </span>
              </div>

              {/* list */}
              {lessons.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "#44406B",
                    letterSpacing: "0.06em",
                  }}
                >
                  Aucune leçon ajoutée · clique sur &quot;Ajouter une leçon&quot; pour commencer
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {lessons.map((l, i) => (
                    <LessonRow
                      key={l.id}
                      lesson={l}
                      idx={i}
                      dragState={dragState}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      onDragEnd={onDragEnd}
                      onRemove={onRemove}
                    />
                  ))}
                </ul>
              )}

              {/* add button */}
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(true);
                }}
                className="pe-add"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: 14,
                  background: "transparent",
                  border: 0,
                  borderTop: "1px dashed rgba(255,255,255,0.08)",
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#6B6890",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 18,
                    height: 18,
                    border: "1px solid currentColor",
                  }}
                >
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  >
                    <path d="M7 2V12M2 7H12" />
                  </svg>
                </span>
                Ajouter une leçon
              </button>

              {/* Totals strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  background: "#050416",
                  borderTop: `1px solid ${BORDER}`,
                  fontFamily: MONO,
                  fontSize: 11,
                }}
              >
                {[
                  { lbl: "Leçons", val: String(totals.count).padStart(2, "0"), brand: true },
                  { lbl: "Durée totale", val: `${(totals.dur / 60).toFixed(1)} h`, brand: false },
                  { lbl: "XP cumulés", val: `+${String(totals.xp)}`, brand: true },
                  { lbl: "Difficulté moy.", val: `${avgDiff} / 4`, brand: false },
                ].map((cell, i) => (
                  <div
                    key={cell.lbl}
                    style={{
                      padding: "11px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      borderRight: i < 3 ? `1px solid ${BORDER}` : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#44406B",
                      }}
                    >
                      {cell.lbl}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: cell.brand ? TURQ : "#F5F5FA",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {cell.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
              style={{ fontFamily: MONO, fontSize: 10.5, color: "#44406B", marginRight: "auto" }}
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
              href="/paths"
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
              {isPending ? "Création…" : "Créer le parcours"}
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
