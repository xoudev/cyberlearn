"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "../../_components/status-badge";
import { updateLessonStatusAction, bulkUpdateLessonStatusAction } from "../_actions/lesson-actions";
import { DeleteLessonButton } from "./delete-lesson-button";

type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface LessonRow {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  status: ContentStatus;
  xpReward: number;
  estimatedMinutes: number;
  completions: number;
  pathLessonsCount: number;
}

interface DiffColor {
  color: string;
  bg: string;
}
const DIFF_DEFAULT: DiffColor = { color: "#6B6890", bg: "rgba(42,37,96,0.3)" };
const DIFF_COLORS: Record<string, DiffColor> = {
  BEGINNER: { color: "#0AFFD4", bg: "rgba(10,255,212,0.1)" },
  INTERMEDIATE: { color: "#4D8BFF", bg: "rgba(77,139,255,0.1)" },
  ADVANCED: { color: "#B14DFF", bg: "rgba(177,77,255,0.1)" },
  EXPERT: { color: "#FFB020", bg: "rgba(255,176,32,0.1)" },
};

const GRID = "32px 120px 1fr 100px 100px 70px 70px 110px 40px";

const CATEGORIES = ["ALL", "DEV", "CYBERSEC", "NETWORK"] as const;
const DIFFICULTIES = ["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
const STATUSES = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;

/** Square, theme-styled checkbox (supports an indeterminate "minus" state). */
function SquareCheckbox({
  checked,
  indeterminate = false,
  onChange,
  title,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  title?: string;
}): React.JSX.Element {
  const active = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{
        width: 16,
        height: 16,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        borderRadius: 0,
        border: `1px solid ${active ? "#0AFFD4" : "#2A2560"}`,
        background: active ? "rgba(10,255,212,0.12)" : "transparent",
        cursor: "pointer",
        transition: "border-color 120ms ease, background 120ms ease",
      }}
    >
      {indeterminate ? (
        <span style={{ width: 8, height: 2, background: "#0AFFD4" }} />
      ) : checked ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6.5L5 9L10 3"
            stroke="#0AFFD4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  appearance: "none",
  background: "rgba(5,4,26,0.6)",
  border: "1px solid #2A2560",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "7px 26px 7px 10px",
  cursor: "pointer",
  borderRadius: 0,
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='7' height='5' viewBox='0 0 7 5'><path d='M1 1l2.5 3L6 1' stroke='%236B6890' stroke-width='1.2' fill='none' stroke-linecap='round'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 9px center",
};

export function LessonsTable({ lessons }: { lessons: LessonRow[] }): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("ALL");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("ALL");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((l) => {
      if (category !== "ALL" && l.category !== category) return false;
      if (difficulty !== "ALL" && l.difficulty !== difficulty) return false;
      if (status !== "ALL" && l.status !== status) return false;
      if (
        q &&
        !l.title.toLowerCase().includes(q) &&
        !l.refCode.toLowerCase().includes(q) &&
        !l.slug.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [lessons, query, category, difficulty, status]);

  const filteredIds = useMemo(() => filtered.map((l) => l.id), [filtered]);
  const selectedInView = filteredIds.filter((id) => selected.has(id)).length;
  const allSelected = filteredIds.length > 0 && selectedInView === filteredIds.length;
  const someSelected = selectedInView > 0 && !allSelected;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  }

  function runBulk(next: ContentStatus) {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkError(null);
    startTransition(async () => {
      const res = await bulkUpdateLessonStatusAction(ids, next);
      if (res.error) {
        setBulkError(res.error);
      } else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  const filtersActive =
    query !== "" || category !== "ALL" || difficulty !== "ALL" || status !== "ALL";

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Rechercher (titre, ref, slug)…"
          style={{
            flex: "1 1 220px",
            minWidth: 180,
            background: "rgba(5,4,26,0.6)",
            border: "1px solid #2A2560",
            color: "#F5F5FA",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "7px 10px",
            borderRadius: 0,
            outline: "none",
          }}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as (typeof CATEGORIES)[number]);
          }}
          style={selectStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ background: "#0A0826" }}>
              {c === "ALL" ? "Catégorie : toutes" : c}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as (typeof DIFFICULTIES)[number]);
          }}
          style={selectStyle}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d} style={{ background: "#0A0826" }}>
              {d === "ALL" ? "Difficulté : toutes" : d}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as (typeof STATUSES)[number]);
          }}
          style={selectStyle}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} style={{ background: "#0A0826" }}>
              {s === "ALL"
                ? "Statut : tous"
                : s === "DRAFT"
                  ? "Brouillon"
                  : s === "PUBLISHED"
                    ? "Publié"
                    : "Archivé"}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("ALL");
              setDifficulty("ALL");
              setStatus("ALL");
            }}
            style={{
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#6B6890",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "7px 12px",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            Réinitialiser
          </button>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#44406B",
          }}
        >
          {String(filtered.length)} / {String(lessons.length)}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            marginBottom: 12,
            background: "rgba(10,255,212,0.06)",
            border: "1px solid rgba(10,255,212,0.3)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              color: "#0AFFD4",
              letterSpacing: "0.08em",
            }}
          >
            {String(selected.size)} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                runBulk("PUBLISHED");
              }}
              style={bulkBtn("#0AFFD4", isPending)}
            >
              Publier
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                runBulk("DRAFT");
              }}
              style={bulkBtn("#6B6890", isPending)}
            >
              Brouillon
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                runBulk("ARCHIVED");
              }}
              style={bulkBtn("#FF4757", isPending)}
            >
              Archiver
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelected(new Set());
            }}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              color: "#6B6890",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Tout désélectionner
          </button>

          {isPending && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#0AFFD4" }}>
              ⟳ en cours…
            </span>
          )}
          {bulkError !== null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#FF4757" }}>
              {bulkError}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div
        className="admin-table-wrap"
        style={{ background: "rgba(5,4,26,0.4)", border: "1px solid #1F1B47" }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            padding: "12px 16px",
            borderBottom: "1px solid #1F1B47",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#44406B",
            alignItems: "center",
          }}
        >
          <SquareCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            title="Tout sélectionner"
          />
          <span>Ref</span>
          <span>Titre</span>
          <span>Catégorie</span>
          <span>Difficulté</span>
          <span style={{ textAlign: "right" }}>XP</span>
          <span style={{ textAlign: "right" }}>Faits</span>
          <span style={{ textAlign: "right" }}>Statut</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: "60px 16px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#6B6890",
            }}
          >
            {lessons.length === 0
              ? "Aucune leçon. Importez votre premier fichier MDX."
              : "Aucune leçon ne correspond aux filtres."}
          </div>
        ) : (
          filtered.map((lesson) => {
            const diff = DIFF_COLORS[lesson.difficulty] ?? DIFF_DEFAULT;
            const isSel = selected.has(lesson.id);
            return (
              <div
                key={lesson.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  padding: "12px 16px",
                  borderBottom: "1px solid #1A1640",
                  alignItems: "center",
                  background: isSel ? "rgba(10,255,212,0.04)" : "transparent",
                  transition: "background 120ms ease",
                }}
              >
                <SquareCheckbox
                  checked={isSel}
                  onChange={() => {
                    toggleOne(lesson.id);
                  }}
                  title="Sélectionner"
                />

                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#4D8BFF" }}>
                  {lesson.refCode}
                </span>

                <div style={{ minWidth: 0 }}>
                  <Link
                    href={`/lessons/${lesson.id}/edit`}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#F5F5FA",
                      textDecoration: "none",
                    }}
                  >
                    {lesson.title}
                  </Link>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "#44406B",
                      marginTop: 2,
                    }}
                  >
                    {lesson.slug} · {String(lesson.estimatedMinutes)} min
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "#6B6890",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {lesson.category}
                </span>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: diff.color,
                    background: diff.bg,
                    padding: "2px 8px",
                    display: "inline-block",
                    width: "fit-content",
                  }}
                >
                  {lesson.difficulty}
                </span>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "#0AFFD4",
                    fontWeight: 700,
                    textAlign: "right",
                  }}
                >
                  {String(lesson.xpReward)}
                </span>

                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#B8B5D1",
                    textAlign: "right",
                  }}
                >
                  {String(lesson.completions)}
                </span>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <StatusBadge
                    entityId={lesson.id}
                    currentStatus={lesson.status}
                    action={updateLessonStatusAction}
                  />
                </div>

                <DeleteLessonButton
                  lessonId={lesson.id}
                  lessonTitle={lesson.title}
                  disabled={lesson.status === "PUBLISHED" || lesson.pathLessonsCount > 0}
                  disabledReason={
                    lesson.status === "PUBLISHED"
                      ? "Archivez la leçon avant de la supprimer"
                      : "Cette leçon appartient à un parcours"
                  }
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function bulkBtn(color: string, pending: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    background: "transparent",
    border: `1px solid ${color}66`,
    color,
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: pending ? "wait" : "pointer",
    borderRadius: 0,
    opacity: pending ? 0.6 : 1,
  };
}
