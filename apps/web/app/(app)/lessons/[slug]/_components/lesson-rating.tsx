"use client";

import React, { useState, useTransition } from "react";
import { averageLine, ratingLabel } from "@cyberlearn/lib/content/rating";
import { rateLessonAction, type RateLessonResult } from "../_actions/rate-lesson";

/** The words that change between rating a lesson and rating a path. */
export interface RatingCopy {
  title: string;
  locked: string;
  railLocked: string;
  placeholder: string;
}

const LESSON_COPY: RatingCopy = {
  title: "Note cette leçon",
  locked: "Complète la leçon pour noter",
  railLocked: "Termine la leçon pour noter et commenter.",
  placeholder: "Commentaire optionnel (500 car. max)",
};

interface LessonRatingProps {
  lessonId: string;
  /** Whether the reader may rate yet: the lesson completed, or for a path one of its lessons. */
  isCompleted: boolean;
  initialScore: number | null;
  initialFeedback: string | null;
  avgRating: number | null;
  ratingsCount: number;
  /**
   * `full` is a card of its own. `rail` has no frame and no eyebrow: it sits
   * in a block of a side column that already has both, and that block is too
   * narrow for a card inside it.
   */
  variant?: "full" | "rail";
  /** In the rail, the class of the surrounding block's title, so the heading reads as that block's own. */
  titleClassName?: string;
  /** Where the rating goes. Defaults to the lesson's own action. */
  submit?: (score: number, feedback: string | undefined) => Promise<RateLessonResult>;
  copy?: RatingCopy;
}

export function LessonRating({
  lessonId,
  isCompleted,
  initialScore,
  initialFeedback,
  avgRating,
  ratingsCount,
  variant = "full",
  titleClassName,
  submit = (score, feedback) => rateLessonAction(lessonId, score, feedback),
  copy = LESSON_COPY,
}: LessonRatingProps): React.ReactElement {
  const [selected, setSelected] = useState<number>(initialScore ?? 0);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [avg, setAvg] = useState(avgRating);
  const [count, setCount] = useState(ratingsCount);
  const [submitted, setSubmitted] = useState(!!initialScore);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rail = variant === "rail";
  const average = averageLine(avg, count);

  function handleSubmit() {
    if (!selected || !isCompleted) return;
    setError(null);
    // A call that fails inside a transition goes to the nearest error boundary,
    // the site's own, and takes the lesson with it. It is said under the
    // stars instead, and the comment typed stays.
    startTransition(async () => {
      let res: RateLessonResult;
      try {
        res = await submit(selected, feedback || undefined);
      } catch {
        setError("Note non envoyée, réessaie.");
        return;
      }
      if (!res.success) {
        setError(res.error ?? "Erreur lors de l'envoi.");
        return;
      }
      if (res.avgRating !== undefined) setAvg(res.avgRating);
      if (res.ratingsCount !== undefined) setCount(res.ratingsCount);
      setSubmitted(true);
    });
  }

  const heading = (
    <div style={{ marginBottom: rail ? 16 : 20 }}>
      {!rail && (
        <div
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              width: 16,
              height: 1,
              background: "var(--cosmetic-accent)",
              display: "inline-block",
            }}
          />
          Évaluation
        </div>
      )}
      <h3
        className={rail ? titleClassName : undefined}
        style={
          rail
            ? { margin: 0 }
            : {
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--color-text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }
        }
      >
        {submitted ? "Ta note a été enregistrée" : copy.title}
      </h3>
      {average !== null && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            margin: "6px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.04em",
            color: "var(--color-text-muted)",
          }}
        >
          <StarFilled size={12} color="var(--color-warning)" />
          {average}
        </p>
      )}
    </div>
  );

  let body: React.ReactElement;
  if (!isCompleted && rail) {
    // A line of muted text: a box here would be a frame inside the block around it.
    body = (
      <p
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          margin: 0,
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--color-text-muted)",
        }}
      >
        <LockIcon style={{ flexShrink: 0, marginTop: 3 }} />
        <span>{copy.railLocked}</span>
      </p>
    );
  } else if (!isCompleted) {
    body = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          background: "rgba(42,37,96,0.4)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <LockIcon />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {copy.locked}
        </span>
      </div>
    );
  } else {
    body = (
      <div>
        <StarPicker
          value={selected}
          size={rail ? 24 : 28}
          disabled={isPending}
          onPick={(n) => {
            setSelected(n);
            // A new score is a new rating to send, with its comment.
            setSubmitted(false);
          }}
        />

        {/* Feedback textarea */}
        {!submitted && selected > 0 && (
          <textarea
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
            }}
            maxLength={500}
            placeholder={copy.placeholder}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginBottom: 14,
              padding: "10px 14px",
              background: "var(--color-bg-sunken)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        )}

        {submitted && feedback && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
              margin: "0 0 14px",
              paddingLeft: 10,
              borderLeft: "2px solid var(--color-border-default)",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {feedback}
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-category-cybersec)",
              margin: "0 0 12px",
            }}
          >
            {error}
          </p>
        )}

        {submitted ? (
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => {
              setSubmitted(false);
            }}
          >
            Modifier
          </button>
        ) : rail ? (
          <button
            className="btn btn--sm btn--block"
            type="button"
            disabled={!selected || isPending}
            onClick={handleSubmit}
          >
            {isPending ? "Envoi…" : "Envoyer la note"}
          </button>
        ) : (
          <button
            className="mono-label"
            type="button"
            disabled={!selected || isPending}
            onClick={handleSubmit}
            style={{
              padding: "10px 22px",
              fontWeight: 700,
              background: selected ? "var(--color-brand-blue)" : "transparent",
              border: `1px solid ${selected ? "var(--color-brand-blue)" : "var(--color-border-default)"}`,
              color: selected ? "#fff" : "var(--color-text-muted)",
              cursor: selected && !isPending ? "pointer" : "default",
              transition: "all 180ms ease",
            }}
          >
            {isPending ? "Envoi…" : "Envoyer la note"}
          </button>
        )}
      </div>
    );
  }

  if (rail) {
    return (
      <div style={{ minWidth: 0 }}>
        {heading}
        {body}
      </div>
    );
  }

  return (
    <div
      className="card card--sunken"
      style={{
        padding: "28px 32px",
        position: "relative",
      }}
    >
      {heading}
      {body}
    </div>
  );
}

/**
 * Five stars, then the word for the score on its own line. The row wraps
 * rather than overflow a narrow column, and the word's line keeps its height
 * while empty, so hovering the first star does not push the rest down.
 */
function StarPicker({
  value,
  size,
  disabled,
  onPick,
}: {
  value: number;
  size: number;
  disabled: boolean;
  onPick: (score: number) => void;
}): React.ReactElement {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: size / 4, minWidth: 0 }}
        onMouseLeave={() => {
          setHovered(null);
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => {
              onPick(n);
            }}
            onMouseEnter={() => {
              setHovered(n);
            }}
            style={{
              display: "flex",
              background: "none",
              border: "none",
              padding: 0,
              cursor: disabled ? "default" : "pointer",
              transition: "transform 120ms ease",
              transform: hovered !== null && n <= hovered ? "scale(1.15)" : "scale(1)",
            }}
            aria-label={`${String(n)} étoile${n > 1 ? "s" : ""}`}
            aria-pressed={n === value}
          >
            {n <= shown ? (
              <StarFilled size={size} color="var(--color-warning)" />
            ) : (
              <StarEmpty size={size} />
            )}
          </button>
        ))}
      </div>
      <div
        style={{
          minHeight: 16,
          marginTop: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          lineHeight: "16px",
          letterSpacing: "0.04em",
          color: "var(--color-text-secondary)",
        }}
      >
        {ratingLabel(shown)}
      </div>
    </div>
  );
}

function LockIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="var(--color-text-muted)"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      style={style}
    >
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7V5C5 3.3 6.3 2 8 2C9.7 2 11 3.3 11 5V7" />
    </svg>
  );
}

function StarFilled({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function StarEmpty({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-border-default)"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
