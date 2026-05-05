"use client";

import React, { useState, useTransition } from "react";
import { submitReviewAction } from "../_actions/review-actions";

interface ReviewCardProps {
  scheduleId: string;
  lessonTitle: string;
  lessonSlug: string;
  lessonXp: number;
  category: string;
  difficulty: string;
  overdueDays: number;
}

const DIFF_COLORS: Record<string, string> = {
  BEGINNER: "#0AFFD4",
  INTERMEDIATE: "#4D8BFF",
  ADVANCED: "#B14DFF",
  EXPERT: "#FFB020",
};

const CAT_LABEL: Record<string, string> = {
  DEV: "Dev",
  CYBERSEC: "Cybersec",
  NETWORK: "Réseau",
};

export function ReviewCard({
  scheduleId,
  lessonTitle,
  lessonSlug,
  lessonXp,
  category,
  difficulty,
  overdueDays,
}: ReviewCardProps): React.ReactElement {
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<"forgot" | "hard" | "easy" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReview(quality: 1 | 3 | 5) {
    startTransition(async () => {
      const res = await submitReviewAction(scheduleId, quality);
      if (res.success) {
        setResult(quality === 1 ? "forgot" : quality === 3 ? "hard" : "easy");
        setDone(true);
      }
    });
  }

  const diffColor = DIFF_COLORS[difficulty] ?? "#6B6890";
  const catLabel = CAT_LABEL[category] ?? category;

  if (done) {
    const msg =
      result === "easy"
        ? { text: "Bien mémorisé ! +XP", color: "#0AFFD4" }
        : result === "hard"
          ? { text: "À revoir dans 1 jour", color: "#FFB020" }
          : { text: "Retour en révision ·  demain", color: "#FF4757" };

    return (
      <div
        style={{
          padding: "20px 24px",
          background: "rgba(5,4,26,0.4)",
          border: "1px solid #1F1B47",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>
          {result === "easy" ? "✓" : result === "hard" ? "~" : "↺"}
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 13,
              color: "#F5F5FA",
              marginBottom: 2,
            }}
          >
            {lessonTitle}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: msg.color }}>
            {msg.text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0A0826", border: "1px solid #1F1B47", padding: "24px 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#6B6890",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {catLabel}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                background: `${diffColor}14`,
                border: `1px solid ${diffColor}30`,
                color: diffColor,
                borderRadius: 999,
                fontSize: 9,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              {difficulty}
            </span>
            {overdueDays > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "#FF4757",
                  fontWeight: 700,
                }}
              >
                +{String(overdueDays)} j de retard
              </span>
            )}
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 16,
              color: "#F5F5FA",
              margin: "0 0 4px",
              letterSpacing: "-0.01em",
            }}
          >
            {lessonTitle}
          </h3>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B6890" }}>
            Révision = +{String(Math.floor(lessonXp * 0.1))} XP
          </span>
        </div>
        <a
          href={`/lessons/${lessonSlug}`}
          style={{
            padding: "7px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6B6890",
            border: "1px solid #2A2560",
            background: "transparent",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Relire →
        </a>
      </div>

      <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 16 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            margin: "0 0 12px",
          }}
        >
          Comment tu as retenu cette leçon ?
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              handleReview(1);
            }}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "11px 12px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.3)",
              color: "#FF4757",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Oublié
          </button>
          <button
            type="button"
            onClick={() => {
              handleReview(3);
            }}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "11px 12px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "rgba(255,176,32,0.08)",
              border: "1px solid rgba(255,176,32,0.3)",
              color: "#FFB020",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Difficile
          </button>
          <button
            type="button"
            onClick={() => {
              handleReview(5);
            }}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "11px 12px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "rgba(10,255,212,0.08)",
              border: "1px solid rgba(10,255,212,0.3)",
              color: "#0AFFD4",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Facile ✓
          </button>
        </div>
      </div>
    </div>
  );
}
