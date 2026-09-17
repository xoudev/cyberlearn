"use client";

// "use client" justification: the grading interaction is stateful (expand a
// row, submit a quality, render the outcome in place) and calls the server
// action through useTransition.

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { submitReviewAction } from "../_actions/review-actions";

export interface ReviewRow {
  scheduleId: string;
  title: string;
  slug: string;
  catLabel: string;
  catColor: string;
  catBorder: string;
  dueText: string;
  dueToday: boolean;
  est: string;
  reviewXp: number;
}

type Outcome = "forgot" | "hard" | "easy";

const OUTCOME_DISPLAY: Record<Outcome, { icon: string; color: string }> = {
  easy: { icon: "✓", color: "var(--cosmetic-accent)" },
  hard: { icon: "~", color: "#FFB020" },
  forgot: { icon: "↺", color: "#FF4757" },
};

function outcomeText(outcome: Outcome, reviewXp: number): string {
  if (outcome === "easy") return `Bien mémorisé · +${String(reviewXp)} XP`;
  if (outcome === "hard") return `Encore fragile · +${String(reviewXp)} XP · à revoir demain`;
  return "Oublié · retour en révision demain";
}

const GRADE_BUTTONS: { quality: 1 | 3 | 5; label: string; color: string }[] = [
  { quality: 1, label: "Oublié", color: "#FF4757" },
  { quality: 3, label: "Difficile", color: "#FFB020" },
  { quality: 5, label: "Facile ✓", color: "var(--cosmetic-accent)" },
];

function GradeRowBody({
  row,
  onDone,
}: {
  row: ReviewRow;
  onDone: (outcome: Outcome, xp: number) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function grade(quality: 1 | 3 | 5) {
    startTransition(async () => {
      const res = await submitReviewAction(row.scheduleId, quality);
      if (res.success) {
        onDone(quality === 1 ? "forgot" : quality === 3 ? "hard" : "easy", res.reviewXp ?? 0);
      }
    });
  }

  return (
    <div
      style={{
        padding: "14px 24px 18px 80px",
        borderTop: "1px dashed rgba(31,27,71,0.8)",
        background: "rgba(5,4,26,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B6890" }}>
          Comment tu as retenu cette leçon ?
          {row.reviewXp > 0 && (
            <span style={{ color: "#44406B" }}> · réussite = +{String(row.reviewXp)} XP</span>
          )}
        </span>
        <Link
          href={`/lessons/${row.slug}`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6B6890",
            textDecoration: "none",
            border: "1px solid #2A2560",
            padding: "6px 12px",
            whiteSpace: "nowrap",
          }}
        >
          Relire la leçon →
        </Link>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {GRADE_BUTTONS.map(({ quality, label, color }) => (
          <button
            key={quality}
            type="button"
            disabled={isPending}
            onClick={() => {
              grade(quality);
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: `${color}14`,
              border: `1px solid ${color}4D`,
              color,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RevisionsList({ rows }: { rows: ReviewRow[] }): React.ReactElement {
  const [openId, setOpenId] = useState<string | null>(rows[0]?.scheduleId ?? null);
  const [done, setDone] = useState<Record<string, { outcome: Outcome; xp: number }>>({});

  return (
    <>
      {rows.map((row, i) => {
        const result = done[row.scheduleId];
        const isOpen = openId === row.scheduleId && !result;
        const borderBottom = i < rows.length - 1 ? "1px solid rgba(31,27,71,0.6)" : "none";

        if (result) {
          const display = OUTCOME_DISPLAY[result.outcome];
          return (
            <div
              key={row.scheduleId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 24px",
                borderBottom,
                background: "rgba(5,4,26,0.4)",
              }}
            >
              <span style={{ fontSize: 16, color: display.color, flexShrink: 0 }}>
                {display.icon}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#6B6890",
                    marginBottom: 2,
                    textDecoration: "line-through",
                  }}
                >
                  {row.title}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: display.color }}>
                  {outcomeText(result.outcome, result.xp)}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={row.scheduleId} style={{ borderBottom }}>
            <button
              type="button"
              onClick={() => {
                setOpenId(isOpen ? null : row.scheduleId);
              }}
              className="rv-row review-row-layout"
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                transition: "background 150ms ease",
              }}
            >
              {/* index */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  color: "#6B6890",
                  background: "#05041A",
                  border: "1px solid #2A2560",
                  width: 36,
                  height: 28,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* body */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      border: `1px solid ${row.catBorder}`,
                      color: row.catColor,
                      background: "rgba(0,0,0,0.2)",
                    }}
                  >
                    {row.catLabel}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "#44406B",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    · auto-évaluation
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "#F5F5FA",
                    margin: 0,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {row.title}
                </h3>
              </div>

              {/* due */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: row.dueToday ? "#FF4D6D" : "#6B6890",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: row.dueToday ? "#FF4D6D" : "#44406B",
                    boxShadow: row.dueToday ? "0 0 6px #FF4D6D" : "none",
                    display: "inline-block",
                  }}
                />
                {row.dueText}
              </div>

              {/* time */}
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#44406B",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {row.est}
              </div>

              {/* toggle */}
              <div
                className="rv-go"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--cosmetic-accent)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  transition: "color 150ms ease",
                }}
              >
                {isOpen ? "Fermer" : "Noter"}
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                >
                  <path
                    d="M3 7H11M8 4L11 7L8 10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {isOpen && (
              <GradeRowBody
                row={row}
                onDone={(outcome, xp) => {
                  setDone((d) => ({ ...d, [row.scheduleId]: { outcome, xp } }));
                  const next = rows.find(
                    (r) => r.scheduleId !== row.scheduleId && !done[r.scheduleId],
                  );
                  setOpenId(next?.scheduleId ?? null);
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
