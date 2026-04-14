import type { ReactNode } from "react";
import { BookOpen, Clock, Zap } from "lucide-react";
import { cn } from "../lib/utils.js";
import { RarityBadge } from "./rarity-badge.js";

/** Difficulty values must match the Difficulty enum in Prisma */
export type LessonDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

const DIFFICULTY_LABELS: Record<LessonDifficulty, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

const DIFFICULTY_COLORS: Record<LessonDifficulty, string> = {
  BEGINNER: "var(--color-success)",
  INTERMEDIATE: "var(--color-info)",
  ADVANCED: "var(--color-warning)",
  EXPERT: "var(--color-danger)",
};

export type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

interface LessonCardProps {
  title: string;
  slug: string;
  difficulty: LessonDifficulty;
  durationMinutes?: number;
  xpReward: number;
  status?: LessonStatus;
  /** Optional category badge (e.g. DEV, CYBERSEC, NETWORK) */
  category?: string;
  /** Rendered as a link wrapper — pass an <a> or Next.js <Link> */
  wrapper?: (children: ReactNode) => ReactNode;
  className?: string;
}

/**
 * Card component for a lesson.
 * Designed for use in lesson lists and path detail pages.
 */
export function LessonCard({
  title,
  difficulty,
  durationMinutes,
  xpReward,
  status = "NOT_STARTED",
  category,
  wrapper,
  className,
}: LessonCardProps) {
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";

  const card = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl p-4 transition-all duration-200",
        "hover:translate-y-[-2px]",
        className,
      )}
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: `1px solid ${isCompleted ? "var(--color-success)" : "var(--color-border-default)"}`,
        boxShadow: isCompleted
          ? "0 0 0 1px color-mix(in srgb, var(--color-success) 20%, transparent)"
          : undefined,
      }}
    >
      {/* Status indicator */}
      {isCompleted && (
        <div
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ backgroundColor: "var(--color-success)", color: "var(--color-bg-base)" }}
          aria-label="Leçon complétée"
        >
          ✓
        </div>
      )}
      {isInProgress && (
        <div
          className="absolute right-3 top-3 h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--color-brand-turquoise)" }}
          aria-label="Leçon en cours"
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-2 pr-6">
        <BookOpen
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: "var(--color-text-muted)" }}
        />
        <h3
          className="line-clamp-2 text-sm font-semibold leading-snug"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h3>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Difficulty */}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: `color-mix(in srgb, ${DIFFICULTY_COLORS[difficulty]} 15%, transparent)`,
            color: DIFFICULTY_COLORS[difficulty],
          }}
        >
          {DIFFICULTY_LABELS[difficulty]}
        </span>

        {/* Category */}
        {category && (
          <RarityBadge rarity="COMMON" className="text-[10px]">
            {/* category label overriding inner text */}
          </RarityBadge>
        )}
        {category && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: "var(--color-bg-overlay)",
              color: "var(--color-text-muted)",
            }}
          >
            {category}
          </span>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-3 border-t pt-3 text-xs"
        style={{
          borderColor: "var(--color-border-subtle)",
          color: "var(--color-text-muted)",
        }}
      >
        {durationMinutes && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {durationMinutes} min
          </span>
        )}
        <span
          className="flex items-center gap-1 font-medium"
          style={{ color: "var(--color-warning)" }}
        >
          <Zap size={11} />
          {xpReward} XP
        </span>
      </div>
    </div>
  );

  return wrapper ? <>{wrapper(card)}</> : card;
}
