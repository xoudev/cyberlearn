/**
 * The placement test in the app. The questions, the scoring and the waivers
 * are the server's (apps/web/lib/onboarding/placement.ts, through
 * /api/mobile/placement/*); the words and the small rules come from
 * @cyberlearn/lib/onboarding/placement, which the site reads too.
 */

import {
  PLACEMENT_CATEGORY_LABEL,
  type PlacementCategory,
  type PlacementScores,
} from "@cyberlearn/lib/onboarding/placement";

export {
  PLACEMENT_CATEGORIES,
  PLACEMENT_CATEGORY_LABEL,
  PLACEMENT_COPY,
  PLACEMENT_DIFFICULTY_LABEL,
  masteredPlacementDomains,
  placementAnswersFrom,
  placementLevelFor,
  placementScoreOf,
  strongestPlacementDomain,
  unansweredPlacementQuestions,
  type PlacementCategory,
  type PlacementScores,
} from "@cyberlearn/lib/onboarding/placement";

export interface PlacementQuestion {
  id: string;
  category: PlacementCategory;
  difficulty: string;
  question: string;
  options: { id: string; text: string }[];
}

export type PlacementTest =
  | { status: "open"; questions: PlacementQuestion[]; estimatedMinutes: number }
  | { status: "taken" }
  | { status: "empty" };

export interface PlacementResult {
  scores: PlacementScores;
  recommendedPathSlug: string | null;
}

/** The goals step offers the test to somebody who says they have a base, as the site does. */
export function offersPlacementTest(level: string): boolean {
  return level !== "NEW";
}

/**
 * Where a question sits: its domain, and its rank within that domain, which is
 * how the site numbers them ("Cybersécurité · 02 / 05").
 */
export function placementQuestionHeading(
  questions: readonly PlacementQuestion[],
  index: number,
): { category: PlacementCategory; label: string; position: number; count: number } | null {
  const question = questions[index];
  if (!question) return null;
  const same = questions.filter((q) => q.category === question.category);
  return {
    category: question.category,
    label: PLACEMENT_CATEGORY_LABEL[question.category],
    position: same.findIndex((q) => q.id === question.id) + 1,
    count: same.length,
  };
}

/** What stops the test from being sent, in French; null when every question is answered. */
export function missingAnswersLabel(missing: number): string | null {
  if (missing <= 0) return null;
  return missing === 1
    ? "Il reste une question sans réponse."
    : `Il reste ${String(missing)} questions sans réponse.`;
}
