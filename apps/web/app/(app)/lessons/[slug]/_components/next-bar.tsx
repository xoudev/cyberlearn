"use client";

import React, { useId } from "react";
import Link from "next/link";
import { nextBarTarget } from "./next-bar-target";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";

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
  /** The next lesson waits for this one to be finished (the path's lock, unlock.ts). */
  nextLocked?: boolean;
}

const ARROW = (
  <svg viewBox="0 0 14 14" width={12} height={12} fill="none" aria-hidden="true">
    <path
      d="M3 7 H11 M8 4 L11 7 L8 10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Where the reader goes once the lesson is read: the next lesson of the path,
 * back to the path, or back to the catalogue.
 *
 * It carried a "Marquer terminé" too, drawn under whichever section was on
 * screen: from the first one it completed the lesson, unread, its quizzes
 * unanswered, while the toolbar above said an exercise held the way. The
 * toolbar's "Terminer", at the end of the last section, is the one way to
 * finish a lesson now.
 */
export function NextBar({ next, placement, nextLocked = false }: NextBarProps): React.ReactElement {
  const catColor = next ? categoryMeta(next.category).color : "var(--cosmetic-accent)";
  const diffLabel = next ? difficultyMeta(next.difficulty).label : "";
  const diffColor = next ? difficultyMeta(next.difficulty).color : "var(--color-rarity-rare)";
  const target = nextBarTarget(next, placement, nextLocked);
  const hintId = useId();

  return (
    <>
      <div
        className="card lesson-next-bar"
        style={{
          marginTop: 88,
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

        {/* Preview: beside the actions, or above them on a phone (globals.css) */}
        <div
          className="lesson-next-bar__preview"
          style={{
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
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
            {target.eyebrow}
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
                color: "var(--color-text-muted)",
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
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 9,
                  color: "var(--color-text-muted)",
                }}
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
              color: "var(--color-text-primary)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {target.title}
          </h3>
        </div>

        {/* Actions */}
        <div className="lesson-next-bar__actions">
          {target.hint !== null && (
            <p id={hintId} className="lesson-next-bar__hint">
              {target.hint}
            </p>
          )}
          {target.href === null ? (
            // The next lesson waits for this one: the button says so rather
            // than lead to a page that sends the reader back to the path map.
            <button
              type="button"
              className="btn btn--sm"
              disabled
              aria-describedby={target.hint !== null ? hintId : undefined}
            >
              {target.action}
              {ARROW}
            </button>
          ) : (
            <Link
              className="btn btn--sm"
              href={target.href}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1F3BFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-brand-blue)";
              }}
            >
              {target.action}
              {ARROW}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
