import {
  suggestPaths,
  type LearningGoal,
  type PathSuggestion,
  type StartingLevel,
} from "@cyberlearn/lib/paths/suggest";
import type { Category, Difficulty } from "@/lib/db";

/**
 * "Trouver mon parcours": the site's two questions, and the same suggestions
 * from the same answers. The ranking is @cyberlearn/lib's, run here on the
 * catalogue read under RLS (useGuidePaths, in queries.ts), so both apps
 * suggest the same paths.
 */

export interface GuidePath {
  slug: string;
  title: string;
  category: Category;
  track: string;
  difficulty: Difficulty;
  lessonCount: number;
  estimatedHours: number;
  refCode: string;
  avgRating: number | null;
}

export interface RawGuidePath {
  slug: string;
  title: string;
  category: Category;
  track: string;
  difficulty: Difficulty;
  estimatedHours: number;
  refCode: string;
  avgRating: number | null;
  path_lessons: { lessonId: string }[] | null;
}

export const GUIDE_PATH_COLUMNS =
  "slug,title,category,track,difficulty,estimatedHours,refCode,avgRating,path_lessons(lessonId)";

export function toGuidePaths(rows: RawGuidePath[]): GuidePath[] {
  return rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    track: p.track,
    difficulty: p.difficulty,
    estimatedHours: p.estimatedHours,
    refCode: p.refCode,
    avgRating: p.avgRating,
    lessonCount: p.path_lessons?.length ?? 0,
  }));
}

export function suggestionsFor(
  paths: readonly GuidePath[],
  goals: readonly LearningGoal[],
  level: StartingLevel | null,
): PathSuggestion<GuidePath>[] {
  if (goals.length === 0 || level === null) return [];
  return suggestPaths(paths, { goals, level });
}

/** Ticks or unticks a goal, keeping the order the choices are listed in. */
export function toggleGoal(
  goals: readonly LearningGoal[],
  goal: LearningGoal,
  order: readonly LearningGoal[],
): LearningGoal[] {
  const next = goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal];
  return order.filter((g) => next.includes(g));
}
