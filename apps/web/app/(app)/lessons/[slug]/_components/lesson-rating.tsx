"use client";

import React, { useState, useTransition } from "react";
import { rateLessonAction } from "../_actions/rate-lesson";

interface LessonRatingProps {
  lessonId: string;
  isCompleted: boolean;
  initialScore: number | null;
  initialFeedback: string | null;
  avgRating: number | null;
  ratingsCount: number;
  variant?: "full" | "rail";
}

export function LessonRating({
  lessonId,
  isCompleted,
  initialScore,
  initialFeedback,
  avgRating,
  ratingsCount,
  variant = "full",
}: LessonRatingProps): React.ReactElement {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(initialScore ?? 0);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [avg, setAvg] = useState(avgRating);
  const [count, setCount] = useState(ratingsCount);
  const [submitted, setSubmitted] = useState(!!initialScore);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayScore = hovered ?? selected;

  function handleSubmit() {
    if (!selected || !isCompleted) return;
    setError(null);
    startTransition(async () => {
      const res = await rateLessonAction(lessonId, selected, feedback || undefined);
      if (!res.success) {
        setError(res.error ?? "Erreur lors de l'envoi.");
        return;
      }
      if (res.avgRating !== undefined) setAvg(res.avgRating);
      if (res.ratingsCount !== undefined) setCount(res.ratingsCount);
      setSubmitted(true);
    });
  }

  const LABELS: Record<number, string> = {
    1: "Difficile à suivre",
    2: "Peut mieux faire",
    3: "Correct",
    4: "Bien",
    5: "Excellent",
  };

  // ── Rail variant: compact teaser/locked state for right rail ──────────────────
  if (variant === "rail") {
    const railHeadStyle: React.CSSProperties = {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#3F3D5C",
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
      paddingBottom: 10,
      borderBottom: "1px solid #1F1B47",
    };

    if (!isCompleted) {
      return (
        <div>
          <div style={railHeadStyle}>Évaluer · verrouillé</div>
          <div
            style={{
              padding: 18,
              border: "1px dashed #1F1B47",
              background: "rgba(5,4,26,0.5)",
              textAlign: "center",
            }}
          >
            {/* Lock icon + label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#44406B",
                marginBottom: 14,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 11 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <rect x="2" y="5" width="7" height="5" rx="0.5" />
                <path d="M3.5 5 V3.5 C3.5 2.4 4.4 1.5 5.5 1.5 C6.6 1.5 7.5 2.4 7.5 3.5 V5" />
              </svg>
              locked
            </div>

            {/* Empty stars */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <svg
                  key={i}
                  width="16"
                  height="16"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="#2A2560"
                  strokeWidth="1.3"
                  aria-hidden="true"
                >
                  <path d="M9 2 L11.2 6.5 L16 7.3 L12.5 10.8 L13.4 15.5 L9 13.3 L4.6 15.5 L5.5 10.8 L2 7.3 L6.8 6.5 Z" />
                </svg>
              ))}
            </div>

            <p
              style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 12,
                color: "#44406B",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Termine la leçon pour noter et commenter.
            </p>
          </div>
        </div>
      );
    }

    // Completed: compact interactive star rating
    return (
      <div>
        <div style={railHeadStyle}>{submitted ? "Évaluer · noté" : "Évaluer"}</div>
        <div style={{ padding: "12px 16px" }}>
          {/* Stars row */}
          <div
            style={{ display: "flex", gap: 6, marginBottom: 10 }}
            onMouseLeave={() => {
              setHovered(null);
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setSelected(n);
                }}
                onMouseEnter={() => {
                  setHovered(n);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: isPending ? "default" : "pointer",
                  transition: "transform 120ms ease",
                  transform: hovered !== null && n <= hovered ? "scale(1.15)" : "scale(1)",
                }}
                aria-label={`${String(n)} étoile${n > 1 ? "s" : ""}`}
              >
                {n <= displayScore ? (
                  <StarFilled size={20} color="#FFB020" />
                ) : (
                  <StarEmpty size={20} />
                )}
              </button>
            ))}
          </div>

          {!submitted && selected > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "#0024FF",
                border: "none",
                color: "#fff",
                cursor: isPending ? "default" : "pointer",
                transition: "background 180ms ease",
              }}
            >
              {isPending ? "Envoi…" : "Envoyer →"}
            </button>
          )}

          {submitted && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#0AFFD4",
                letterSpacing: "0.08em",
              }}
            >
              <svg viewBox="0 0 12 12" width={8} height={8} fill="none">
                <path
                  d="M2 6 L5 9 L10 3"
                  stroke="#0AFFD4"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Note enregistrée
            </div>
          )}

          {error && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#FF4757",
                margin: "8px 0 0",
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Full variant (default) ────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: "28px 32px",
        background: "rgba(5,4,26,0.6)",
        border: "1px solid #1F1B47",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B6890",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{ width: 16, height: 1, background: "#0AFFD4", display: "inline-block" }}
            />
            Évaluation
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 16,
              color: "#F5F5FA",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {submitted ? "Ta note a été enregistrée" : "Note cette leçon"}
          </h3>
        </div>

        {avg !== null && count > 0 && (
          <div style={{ textAlign: "right" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}
            >
              <StarFilled size={14} color="#FFB020" />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#F5F5FA",
                  letterSpacing: "-0.02em",
                }}
              >
                {avg.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#6B6890",
                letterSpacing: "0.06em",
              }}
            >
              {count} note{count > 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {!isCompleted ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            background: "rgba(42,37,96,0.4)",
            border: "1px solid #2A2560",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#6B6890"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <rect x="3" y="7" width="10" height="7" rx="1" />
            <path d="M5 7V5C5 3.3 6.3 2 8 2C9.7 2 11 3.3 11 5V7" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              letterSpacing: "0.04em",
            }}
          >
            Complète la leçon pour noter
          </span>
        </div>
      ) : (
        <div>
          {/* Stars */}
          <div
            style={{ display: "flex", gap: 8, marginBottom: 14 }}
            onMouseLeave={() => {
              setHovered(null);
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setSelected(n);
                }}
                onMouseEnter={() => {
                  setHovered(n);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: isPending ? "default" : "pointer",
                  transition: "transform 120ms ease",
                  transform: hovered !== null && n <= hovered ? "scale(1.2)" : "scale(1)",
                }}
                aria-label={`${String(n)} étoile${n > 1 ? "s" : ""}`}
              >
                {n <= displayScore ? (
                  <StarFilled size={28} color="#FFB020" />
                ) : (
                  <StarEmpty size={28} />
                )}
              </button>
            ))}
            {displayScore > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#B8B5D1",
                  letterSpacing: "0.04em",
                  alignSelf: "center",
                  marginLeft: 8,
                }}
              >
                {LABELS[displayScore]}
              </span>
            )}
          </div>

          {/* Feedback textarea */}
          {!submitted && selected > 0 && (
            <textarea
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
              }}
              maxLength={500}
              placeholder="Commentaire optionnel (500 car. max)"
              rows={3}
              style={{
                width: "100%",
                marginBottom: 14,
                padding: "10px 14px",
                background: "#05041A",
                border: "1px solid #2A2560",
                color: "#F5F5FA",
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
                color: "#B8B5D1",
                margin: "0 0 14px",
                padding: "10px 14px",
                background: "rgba(10,8,38,0.5)",
                border: "1px solid #1F1B47",
              }}
            >
              {feedback}
            </p>
          )}

          {error && (
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#FF4757",
                margin: "0 0 12px",
              }}
            >
              {error}
            </p>
          )}

          {!submitted ? (
            <button
              type="button"
              disabled={!selected || isPending}
              onClick={handleSubmit}
              style={{
                padding: "10px 22px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: selected ? "#0024FF" : "transparent",
                border: `1px solid ${selected ? "#0024FF" : "#2A2560"}`,
                color: selected ? "#fff" : "#6B6890",
                cursor: selected && !isPending ? "pointer" : "default",
                transition: "all 180ms ease",
              }}
            >
              {isPending ? "Envoi…" : "Envoyer la note"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
              }}
              style={{
                padding: "8px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid #2A2560",
                color: "#6B6890",
                cursor: "pointer",
              }}
            >
              Modifier
            </button>
          )}
        </div>
      )}
    </div>
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
      stroke="#2A2560"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
