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
    <div className="revision-grade" id={`review-grade-${row.scheduleId}`}>
      <div className="revision-grade__intro">
        <p>
          Comment tu as retenu cette leçon ?
          {row.reviewXp > 0 && (
            <>
              <br />
              Réussite = +{row.reviewXp} XP
            </>
          )}
        </p>
        <Link className="workspace-link" href={`/lessons/${row.slug}`}>
          Relire la leçon ↗
        </Link>
      </div>
      <div className="revision-grades">
        {GRADE_BUTTONS.map(({ quality, label }) => (
          <button
            key={quality}
            type="button"
            disabled={isPending}
            onClick={() => {
              grade(quality);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {isPending && (
        <p className="revision-grade__intro" role="status">
          Enregistrement…
        </p>
      )}
      {error !== null && (
        <p role="alert" className="revision-error">
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
      <section aria-label="Leçons de la session">
        <div className="revision-rows">
          {session.map((row, i) => {
            const result = done[row.scheduleId];
            const isOpen = openId === row.scheduleId && !result;
            if (result) {
              const display = OUTCOME_DISPLAY[result.outcome];
              return (
                <div key={row.scheduleId} className="revision-entry revision-completed">
                  <span aria-hidden="true">{display.icon}</span>
                  <div>
                    <h3>{row.title}</h3>
                    <p>{outcomeText(result.outcome, result.xp)}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={row.scheduleId} className="revision-entry">
                <button
                  type="button"
                  className="revision-toggle"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `review-grade-${row.scheduleId}` : undefined}
                  onClick={() => {
                    setOpenId(isOpen ? null : row.scheduleId);
                  }}
                >
                  <span className="revision-index">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="revision-toggle__meta">
                      <span>{row.catLabel}</span>
                      <span>{row.dueText}</span>
                      <span>{row.est}</span>
                    </span>
                    <strong className="revision-title">{row.title}</strong>
                  </span>
                  <span className="revision-toggle__action">{isOpen ? "Fermer −" : "Noter +"}</span>
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
