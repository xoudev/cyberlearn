import type { ReactNode } from "react";
import React from "react";
export type LessonDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type LessonCategory = "CYBERSEC" | "DEV" | "NETWORK";
interface LessonCardProps {
  title: string;
  slug: string;
  difficulty: LessonDifficulty;
  category: string;
  durationMinutes?: number | undefined;
  xpReward: number;
  status?: LessonStatus | undefined;
  description?: string | undefined;
  refCode?: string | undefined;
  currentSection?: number | undefined;
  totalSections?: number | undefined;
  /** "catalog" = full card with cover; "compact" = minimal list card */
  variant?: "catalog" | "compact" | undefined;
  /** Client-only: wrap with arbitrary JSX. Cannot be passed from Server Components — use <Link><LessonCard /></Link> pattern instead. */
  wrapper?: ((children: ReactNode) => ReactNode) | undefined;
  className?: string | undefined;
}
export declare function LessonCard({
  title,
  description,
  difficulty,
  category,
  durationMinutes,
  xpReward,
  status,
  refCode,
  currentSection,
  totalSections,
  variant,
  wrapper,
}: LessonCardProps): React.ReactElement;
export {};
//# sourceMappingURL=lesson-card.d.ts.map
