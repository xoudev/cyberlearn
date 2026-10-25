"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { createPathAction, type CreatePathState } from "../../_actions/path-actions";
import { ModalShell, Select } from "@cyberlearn/ui";
import { CoverUploadField } from "@/app/(admin)/lessons/_components/cover-upload-field";
import { keepFormInput } from "@/lib/form-input";

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

const BORDER = "var(--a-border-2)";
const DANGER = "var(--a-danger)";
const TURQ = "var(--a-accent)";
const MONO = "var(--font-sans)";
const BODY_F = "var(--font-sans)";

// Canonical public host (same source as the verify link / cert); no hardcoded .app.
const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr").replace(
  /^https?:\/\//,
  "",
);

const ACCENT_MAP: Record<string, string> = {
  à: "a",
  â: "a",
  ä: "a",
  á: "a",
  ã: "a",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  î: "i",
  ï: "i",
  í: "i",
  ì: "i",
  ô: "o",
  ö: "o",
  ó: "o",
  ò: "o",
  õ: "o",
  ù: "u",
  û: "u",
  ü: "u",
  ú: "u",
  ç: "c",
  ñ: "n",
  ý: "y",
  ÿ: "y",
};

/** Slugify a title into a URL slug matching the server rule /^[a-z0-9-]+$/. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((c) => ACCENT_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_CHIPS: Record<string, { color: string; border: string }> = {
  CYBERSEC: { color: "var(--color-category-cybersec)", border: "var(--a-border-2)" },
  NETWORK: { color: "var(--color-category-network)", border: "var(--a-border-2)" },
  DEV: { color: "var(--color-category-dev)", border: "var(--a-border-2)" },
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
    <span style={{ letterSpacing: "-0.05em", color: "var(--a-muted)" }}>
      {"◆".repeat(n)}
      <span style={{ color: "var(--a-muted)" }}>{"◇".repeat(4 - n)}</span>
    </span>
  );
}

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
      {req && <span style={{ color: DANGER }}>*</span>}
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
  const cat = CAT_CHIPS[lesson.category] ?? {
    color: "var(--a-muted)",
    border: "var(--a-border-2)",
  };

  return (
    <li
      className="a-path-lesson"
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
        alignItems: "center",
        gap: 14,
        padding: "12px 16px 12px 8px",
        borderBottom: `1px solid var(--a-border)`,
        background: isDropTarget || isDragging ? "var(--a-hover)" : "var(--a-surface)",
        outline: isDragging ? `1px solid ${TURQ}` : isDropTarget ? `1px dashed ${TURQ}` : "none",
        outlineOffset: -1,
        boxShadow: isDragging ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--a-accent)` : "none",
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
          color: isDragging ? TURQ : "var(--a-muted)",
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
          color: idx === 0 ? TURQ : "var(--a-muted)",
          background: "var(--a-bg)",
          border: `1px solid ${idx === 0 ? TURQ : BORDER}`,
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
            color: "var(--a-fg)",
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
            color: "var(--a-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: TURQ }}>{lesson.refCode}</span>
          <span style={{ color: "var(--a-muted)" }}>·</span>
          {diamonds(lesson.difficulty)}
          <span style={{ color: "var(--a-muted)" }}>·</span>
          <span>
            <b style={{ color: "var(--a-muted)" }}>{lesson.estimatedMinutes}</b> min
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
            border: `1px solid var(--a-accent)`,
            color: TURQ,
            background: "var(--a-surface)",
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
          color: "var(--a-muted)",
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
    <ModalShell
      open
      onClose={onClose}
      maxWidth={640}
      eyebrow="ADMIN · Parcours"
      title="Ajouter une leçon"
      ariaLabel="Administration : ajouter une leçon au parcours"
    >
      <div
        style={{
          width: "100%",
          background: "var(--a-surface)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
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
                color: "var(--a-muted)",
              }}
            >
              Aucune leçon disponible
            </div>
          ) : (
            filtered.map((l) => {
              const cat = CAT_CHIPS[l.category] ?? {
                color: "var(--a-muted)",
                border: "var(--a-border-2)",
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
                    borderBottom: `1px solid var(--a-border)`,
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
                        color: "var(--a-fg)",
                        margin: "0 0 3px",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {l.title}
                    </p>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--a-muted)" }}>
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
    </ModalShell>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

const initialState: CreatePathState = {};

export function NewPathClient({
  availableLessons,
  nextRefCode,
}: {
  availableLessons: AvailableLesson[];
  nextRefCode: string;
}): React.JSX.Element {
  const [state, action, isPending] = useActionState(createPathAction, initialState);
  const [lessons, setLessons] = useState<AvailableLesson[]>([]);
  const [dragState, setDragState] = useState<DragState>({ dragId: null, overId: null });
  const [pickerOpen, setPickerOpen] = useState(false);
  // Smart defaults: refCode pre-filled with the next sequence, slug derived from
  // the title until the admin edits it manually.
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

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

      {/* Quiz management needs a pathId → only available after the first save. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
          padding: "12px 16px",
          background: "var(--a-surface)",
          border: "1px solid var(--a-border)",
          borderLeft: "3px solid var(--a-border-2)",
        }}
      >
        <span
          aria-disabled="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--a-muted)",
            background: "transparent",
            border: "1px solid var(--a-border)",
            cursor: "not-allowed",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
            <path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7" />
          </svg>
          Gérer le quiz final
        </span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--a-muted)" }}>
          {"Enregistre le parcours d'abord pour gérer le quiz final."}
        </span>
      </div>

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
        {/* Hidden ordered lesson IDs */}
        <input type="hidden" name="lessonIds" value={JSON.stringify(lessons.map((l) => l.id))} />

        {/* refCode + slug */}
        <div className="admin-form-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-refCode" req hint="Auto-généré">
              Ref code
            </Label>
            <input
              id="admin-editor-refCode"
              name="refCode"
              type="text"
              required
              defaultValue={nextRefCode}
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
                value={slug}
                onChange={(e) => {
                  // Lenient while typing manually: keep dashes, just drop invalid chars.
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  setSlugTouched(true);
                }}
                placeholder="nom-du-parcours"
                className="le-input"
                style={{ ...BASE_INPUT, border: 0, background: "transparent", flex: 1 }}
              />
            </div>
            <Help>
              {SITE_HOST}/parcours/<b style={{ color: TURQ }}>{slug || "votre-slug"}</b>
            </Help>
            <FieldErr msg={state.fieldErrors?.slug} />
          </div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label htmlFor="admin-editor-title" req hint="3–200 caractères">
            Titre
          </Label>
          <input
            id="admin-editor-title"
            name="title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              if (!slugTouched) setSlug(slugify(v));
            }}
            placeholder="Titre du parcours"
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
            hint="10–1000 caractères · affichée sur la page parcours"
          >
            Description
          </Label>
          <textarea
            id="admin-editor-description"
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

        {/* Track: what the path is for, orthogonal to the domain it covers. */}
        <div className="admin-form-grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label htmlFor="admin-editor-track" req>
              Type de parcours
            </Label>
            <div style={{ position: "relative" }}>
              <Select
                id="admin-editor-track"
                name="track"
                required
                defaultValue={"SKILL"}
                options={[
                  { value: "SKILL", label: "Compétence : un langage, un outil, un socle" },
                  { value: "CAREER", label: "Métier : un rôle complet" },
                ]}
              />
            </div>
            <FieldErr msg={state.fieldErrors?.track} />
          </div>
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
                  { value: "DEV", label: "Développement" },
                  { value: "CYBERSEC", label: "Cybersécurité" },
                  { value: "NETWORK", label: "Réseau" },
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

        {/* Duration */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
          <Label htmlFor="admin-editor-estimatedHours" req>
            Durée estimée (heures)
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
              id="admin-editor-estimatedHours"
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
                color: "var(--a-muted)",
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

        {/* Cover image: uploaded to the private bucket, like a lesson's. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label hint="// 1280×720 · bucket privé">Image de couverture</Label>
          <CoverUploadField initialMarker={null} initialPreview={null} />
          <Help>
            Sans image envoyée, le site montre l&apos;illustration du parcours, ou celle de sa
            catégorie.
          </Help>
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
                color: "var(--a-fg)",
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
              Le parcours sera visible par tous les apprenants dès sa création. Sinon il reste en
              brouillon.
            </p>
          </div>
        </label>

        {/* Lessons section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Label hint="// glisse pour réordonner">Leçons du parcours</Label>
          <div style={{ border: `1px solid ${BORDER}`, background: "var(--a-surface)" }}>
            {/* section head */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: `1px solid ${BORDER}`,
                background: "var(--a-bg)",
              }}
            >
              <h3
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--a-fg-2)",
                  margin: 0,
                }}
              >
                <b style={{ color: TURQ }}>{lessons.length}</b> leçons · ordre actuel
              </h3>
              <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--a-muted)" }}>
                <b>{(totals.dur / 60).toFixed(1)} h</b> total · <b>{totals.xp}</b> XP cumulés
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
                  color: "var(--a-muted)",
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
                color: "var(--a-muted)",
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
              className="a-path-totals"
              style={{
                background: "var(--a-bg)",
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
                      color: "var(--a-muted)",
                    }}
                  >
                    {cell.lbl}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: cell.brand ? TURQ : "var(--a-fg)",
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
            justifyContent: "flex-end",
          }}
        >
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
              color: "var(--a-muted)",
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
              background: "var(--a-accent)",
              color: "var(--a-ink)",
              border: 0,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Création…" : "Créer le parcours"}
            <span style={{ fontWeight: 400 }}>→</span>
          </button>
        </div>
      </form>
    </>
  );
}
