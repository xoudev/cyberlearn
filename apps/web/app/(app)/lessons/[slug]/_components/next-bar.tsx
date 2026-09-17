"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompleteButton } from "./complete-button";
import { LessonCompleteModal } from "./lesson-complete-modal";
import type { CompleteLessonResult } from "../_actions/track-progress";

const DIFF_LABELS: Record<string, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};
const DIFF_COLORS: Record<string, string> = {
  BEGINNER: "var(--cosmetic-accent)",
  INTERMEDIATE: "#6E8BFF",
  ADVANCED: "#FF4757",
  EXPERT: "#FFB020",
};
const CAT_COLORS: Record<string, string> = {
  CYBERSEC: "#FF4757",
  DEV: "#6E8BFF",
  NETWORK: "#0AFFD4",
};

interface NextBarProps {
  /** The next lesson of the same path. Null on the lesson that closes it. */
  next: {
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    xpReward: number;
    estimatedMinutes: number;
  } | null;
  /** Where this lesson sits, so the reader can see the path they are walking. */
  placement: { path: { slug: string; title: string }; rank: number; total: number } | null;
  lessonId: string;
  lessonTitle: string;
  xpReward: number;
  isCompleted: boolean;
}

export function NextBar({
  next,
  placement,
  lessonId,
  lessonTitle,
  xpReward,
  isCompleted,
}: NextBarProps): React.ReactElement {
  const catColor = next ? (CAT_COLORS[next.category] ?? "#6E8BFF") : "var(--cosmetic-accent)";
  const diffLabel = next ? (DIFF_LABELS[next.difficulty] ?? next.difficulty) : "";
  const diffColor = next ? (DIFF_COLORS[next.difficulty] ?? "#6E8BFF") : "#6E8BFF";

  // Modal state lives here - NextBar stays mounted even after isCompleted flips to true
  const [completionResult, setCompletionResult] = useState<CompleteLessonResult | null>(null);
  const router = useRouter();

  function handleClose() {
    setCompletionResult(null);
    router.refresh();
  }

  return (
    <>
      <div
        style={{
          marginTop: 88,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          border: "1px solid #2A2560",
          background: "rgba(10,8,38,0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle gradient accent */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, transparent 40%, color-mix(in srgb, var(--cosmetic-accent) 5%, transparent) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Preview */}
        <div
          style={{
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderRight: "1px solid #2A2560",
            minWidth: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--cosmetic-accent)",
            }}
          >
            <span style={{ fontWeight: 700 }}>›</span>
            {next ? "Prochaine leçon" : "Dernière leçon du parcours"}
          </span>

          {/* Which path this is, and how far along - the reader is walking a
              path, not a list, and the bar is where that used to go unsaid. */}
          {placement !== null && (
            <Link
              href={`/paths/${placement.path.slug}`}
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "#6B6890",
                textDecoration: "none",
              }}
            >
              {placement.path.title} · {placement.rank}/{placement.total}
            </Link>
          )}

          {next && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "2px 8px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: catColor,
                  background: `color-mix(in srgb, ${catColor} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${catColor} 25%, transparent)`,
                }}
              >
                {next.category}
              </span>
              <span
                style={{
                  padding: "2px 8px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: diffColor,
                  background: `color-mix(in srgb, ${diffColor} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${diffColor} 25%, transparent)`,
                }}
              >
                {diffLabel}
              </span>
              <span
                style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 9, color: "#3F3D5C" }}
              >
                {next.estimatedMinutes} min · +{next.xpReward} XP
              </span>
            </div>
          )}

          <h3
            style={{
              fontFamily: "var(--font-display, sans-serif)",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.01em",
              color: "#F5F5FA",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {next ? next.title : (placement?.path.title ?? "Parcours terminé")}
          </h3>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {/* CompleteButton unmounts when isCompleted flips - that's fine, modal state is here */}
          {!isCompleted && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
                borderRight: "1px solid #2A2560",
              }}
            >
              <CompleteButton
                lessonId={lessonId}
                xpReward={xpReward}
                variant="ghost"
                onComplete={setCompletionResult}
              />
            </div>
          )}

          <Link
            href={next ? `/lessons/${next.slug}` : `/paths/${placement?.path.slug ?? ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "0 32px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
              background: "#0024FF",
              color: "#ffffff",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15), 0 0 40px rgba(0,36,255,0.35)",
              minHeight: 88,
              transition: "background 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1F3BFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0024FF";
            }}
          >
            {next ? "Leçon suivante" : "Retour au parcours"}
            <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
              <path
                d="M3 7 H11 M8 4 L11 7 L8 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Modal rendered outside NextBar's conditional blocks - stays alive until explicitly closed */}
      {completionResult !== null && (
        <LessonCompleteModal
          result={completionResult}
          lessonTitle={lessonTitle}
          onClose={handleClose}
        />
      )}
    </>
  );
}
