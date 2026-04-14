import type { ReactNode } from "react";
/** Difficulty values must match the Difficulty enum in Prisma */
export type LessonDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
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
export declare function LessonCard({
  title,
  difficulty,
  durationMinutes,
  xpReward,
  status,
  category,
  wrapper,
  className,
}: LessonCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=lesson-card.d.ts.map
