import React from "react";
import Link from "next/link";
import { LESSON_NEXT_ID, nextBarTarget } from "./next-bar-target";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";

interface NextBarProps {
  next: {
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    xpReward: number;
    estimatedMinutes: number;
  } | null;
  placement: { path: { slug: string; title: string }; rank: number; total: number } | null;
  nextLocked?: boolean;
}

export function NextBar({ next, placement, nextLocked = false }: NextBarProps): React.ReactElement {
  const target = nextBarTarget(next, placement, nextLocked);
  // The lesson page renders one next-lesson bar.
  const hintId = "lesson-next-hint";
  return (
    // Focusable from a script only: the recap of a finished lesson goes on to it.
    <section
      id={LESSON_NEXT_ID}
      tabIndex={-1}
      className="card lesson-next-bar"
      aria-label="Après cette leçon"
    >
      <div className="lesson-next-bar__preview">
        <p className="lesson-next-bar__eyebrow">{target.eyebrow}</p>
        {placement !== null && (
          <Link className="lesson-next-bar__path" href={`/paths/${placement.path.slug}`}>
            {placement.path.title} · {placement.rank}/{placement.total}
          </Link>
        )}
        {next && (
          <div className="lesson-next-bar__facts">
            <span>{categoryMeta(next.category).short}</span>
            <span>{difficultyMeta(next.difficulty).label}</span>
            <span>{next.estimatedMinutes} min</span>
            <span>+{next.xpReward} XP</span>
          </div>
        )}
        <h3>{target.title}</h3>
      </div>
      <div className="lesson-next-bar__actions">
        {target.hint !== null && (
          <p id={hintId} className="lesson-next-bar__hint">
            {target.hint}
          </p>
        )}
        {target.href === null ? (
          <button
            type="button"
            className="btn"
            disabled
            aria-describedby={target.hint !== null ? hintId : undefined}
          >
            {target.action}
          </button>
        ) : (
          <Link className="btn" href={target.href}>
            {target.action}
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h9.5M8.5 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="square"
              />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}
