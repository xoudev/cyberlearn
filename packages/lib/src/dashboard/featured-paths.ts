/**
 * Which two paths the home page leads with: the site's dashboard and the app's
 * home tab both ask this, and both must answer it the same way, or somebody
 * sees one path suggested on their laptop and another on their phone.
 *
 * A path already finished is never suggested. Among the rest, one in progress
 * wins by a wide margin; after that, the path at the reader's level, the
 * domains their placement test rated them strongest in, and the domains of
 * their last lessons. Ties go by title, so the answer does not depend on the
 * order the database happened to return the rows in.
 */

export type PathDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface FeaturedCandidate {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  /** The reader's progress on the path, or null when never started. */
  status: string | null;
}

export interface FeaturedContext {
  level: number;
  /** Placement scores out of 100, by domain; null when the test was skipped. */
  placement: { DEV: number; CYBERSEC: number; NETWORK: number } | null;
  /** The domains of the reader's recently completed lessons, newest first. */
  recentCategories: readonly string[];
}

/** The difficulty that suits a level. */
export function preferredDifficulty(level: number): PathDifficulty {
  if (level <= 5) return "BEGINNER";
  if (level <= 12) return "INTERMEDIATE";
  if (level <= 20) return "ADVANCED";
  return "EXPERT";
}

/** How well a path suits the reader; higher leads. */
export function featuredScore(path: FeaturedCandidate, context: FeaturedContext): number {
  let score = 0;
  if (path.status === "IN_PROGRESS") score += 50;
  if (path.difficulty === preferredDifficulty(context.level)) score += 15;
  const placement: Record<string, number> = context.placement ?? {};
  score += ((placement[path.category] ?? 50) / 100) * 25;
  const momentum = context.recentCategories.filter((c) => c === path.category).length;
  score += Math.min(momentum * 3, 15);
  return score;
}

/** The paths to lead with, best first: at most `limit`, none already finished. */
export function rankFeaturedPaths<T extends FeaturedCandidate>(
  paths: readonly T[],
  context: FeaturedContext,
  limit = 2,
): T[] {
  return paths
    .filter((path) => path.status !== "COMPLETED")
    .map((path) => ({ path, score: featuredScore(path, context) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.path.title.localeCompare(b.path.title, "fr") ||
        a.path.id.localeCompare(b.path.id),
    )
    .slice(0, limit)
    .map(({ path }) => path);
}
