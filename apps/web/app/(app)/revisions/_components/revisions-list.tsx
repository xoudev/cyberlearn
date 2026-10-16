"use client";

// "use client" justification: the grading interaction is stateful (expand a
// row, submit a quality, render the outcome in place) and calls the server
// action through useTransition.

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  outcomeOf,
  reviewOutcomeText,
  type ReviewOutcome,
} from "@cyberlearn/lib/revisions/review-display";
import { submitReviewAction } from "../_actions/review-actions";
import { extendSession } from "./review-session";

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

type Outcome = ReviewOutcome;

const OUTCOME_DISPLAY: Record<Outcome, { icon: string; color: string }> = {
  mastered: { icon: "★", color: "var(--cosmetic-accent)" },
  easy: { icon: "✓", color: "var(--cosmetic-accent)" },
  hard: { icon: "~", color: "var(--color-warning)" },
  forgot: { icon: "↺", color: "var(--color-category-cybersec)" },
};

const outcomeText = reviewOutcomeText;

const GRADE_BUTTONS: { quality: 1 | 3 | 5; label: string; color: string }[] = [
  { quality: 1, label: "Oublié", color: "var(--color-category-cybersec)" },
  { quality: 3, label: "Difficile", color: "var(--color-warning)" },
  { quality: 5, label: "Facile ✓", color: "var(--cosmetic-accent)" },
];

/** When the request itself fails: nothing came back to say why. */
const GRADE_FAILED = "La révision n'a pas pu être enregistrée. Réessaie.";
/** A refusal that came without its reason. */
const GRADE_REFUSED = "Cette révision n'est plus à faire.";

function GradeRowBody({
  row,
  onDone,
}: {
  row: ReviewRow;
  onDone: (outcome: Outcome, xp: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  // A refused grade used to leave the three buttons doing nothing, without a
  // word: graded already in another tab or on the phone, say.
  const [error, setError] = useState<string | null>(null);

  function grade(quality: 1 | 3 | 5) {
    setError(null);
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof submitReviewAction>>;
      try {
        res = await submitReviewAction(row.scheduleId, quality);
      } catch {
        setError(GRADE_FAILED);
        return;
      }
      if (res.success) {
        onDone(outcomeOf(quality, res.mastered === true), res.reviewXp ?? 0);
      } else {
        setError(res.error ?? GRADE_REFUSED);
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
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-muted)" }}
        >
          Comment tu as retenu cette leçon ?
          {row.reviewXp > 0 && (
            <span style={{ color: "var(--color-text-faint)" }}>
              {" "}
              · réussite = +{String(row.reviewXp)} XP
            </span>
          )}
        </span>
        <Link
          className="mono-label card card--ghost"
          href={`/lessons/${row.slug}`}
          style={{
            color: "var(--color-text-muted)",
            textDecoration: "none",
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
              background: `color-mix(in srgb, ${color} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              color,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error !== null && (
        <p
          role="alert"
          style={{
            margin: "10px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-danger)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

interface RevisionsListProps {
  /** The day's session as the page last loaded it. */
  rows: ReviewRow[];
  /** Shown when the session never had a row. */
  empty?: React.ReactNode;
  /** Closes the list's card. */
  footer?: React.ReactNode;
  /** Below the card. */
  children?: React.ReactNode;
}

/**
 * The day's reviews, graded in place. Each grade reloads the page, which comes
 * back without the review just graded; the list keeps it, struck through with
 * its outcome, until the reader leaves (extendSession). It also stays up when
 * that was the last one: `empty` is for a session that never started.
 */
export function RevisionsList({
  rows,
  empty,
  footer,
  children,
}: RevisionsListProps): React.ReactElement {
  const [session, setSession] = useState<readonly ReviewRow[]>(rows);
  const [loaded, setLoaded] = useState(rows);
  if (rows !== loaded) {
    setLoaded(rows);
    setSession((s) => extendSession(s, rows));
  }
  const [openId, setOpenId] = useState<string | null>(rows[0]?.scheduleId ?? null);
  const [done, setDone] = useState<Record<string, { outcome: Outcome; xp: number }>>({});

  if (session.length === 0) return <>{empty}</>;

  return (
    <>
      <section style={{ marginBottom: 0 }}>
        <div className="card" style={{ overflow: "hidden" }}>
          {session.map((row, i) => {
            const result = done[row.scheduleId];
            const isOpen = openId === row.scheduleId && !result;
            const borderBottom = i < session.length - 1 ? "1px solid rgba(31,27,71,0.6)" : "none";

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
                        color: "var(--color-text-muted)",
                        marginBottom: 2,
                        textDecoration: "line-through",
                      }}
                    >
                      {row.title}
                    </div>
                    <div
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: display.color }}
                    >
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
                    className="card"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      color: "var(--color-text-muted)",
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
                        className="mono-label"
                        style={{
                          fontWeight: 700,
                          padding: "2px 8px",
                          border: `1px solid ${row.catBorder}`,
                          color: row.catColor,
                          background: "rgba(0,0,0,0.2)",
                        }}
                      >
                        {row.catLabel}
                      </span>
                      <span
                        className="mono-label"
                        style={{
                          color: "var(--color-text-faint)",
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
                        color: "var(--color-text-primary)",
                        margin: 0,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {row.title}
                    </h3>
                  </div>

                  {/* due */}
                  <div
                    className="mono-label"
                    style={{
                      color: row.dueToday ? "var(--color-danger)" : "var(--color-text-muted)",
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
                        background: row.dueToday
                          ? "var(--color-danger)"
                          : "var(--color-text-faint)",
                        boxShadow: row.dueToday ? "0 0 6px var(--color-danger)" : "none",
                        display: "inline-block",
                      }}
                    />
                    {row.dueText}
                  </div>

                  {/* time */}
                  <div
                    className="mono-label"
                    style={{
                      color: "var(--color-text-faint)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.est}
                  </div>

                  {/* toggle */}
                  <div
                    className="rv-go mono-label"
                    style={{
                      fontWeight: 700,
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
                      const next = session.find(
                        (r) => r.scheduleId !== row.scheduleId && !done[r.scheduleId],
                      );
                      setOpenId(next?.scheduleId ?? null);
                    }}
                  />
                )}
              </div>
            );
          })}
          {footer}
        </div>
      </section>
      {children}
    </>
  );
}
