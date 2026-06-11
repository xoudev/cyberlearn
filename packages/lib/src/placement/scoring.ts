import { PLACEMENT_MASTERY_THRESHOLD } from "@cyberlearn/types";

export interface QuestionResult {
  category: "DEV" | "CYBERSEC" | "NETWORK";
  isCorrect: boolean;
}

export interface CategoryScores {
  devScore: number;
  cybersecScore: number;
  networkScore: number;
}

export interface MasteredCategories {
  DEV: boolean;
  CYBERSEC: boolean;
  NETWORK: boolean;
}

/**
 * Computes per-category scores (0–100) from raw question results.
 * Score = (correct answers in category / total questions in category) * 100
 * Categories with no questions receive a score of 0.
 */
export function computePlacementScores(results: QuestionResult[]): CategoryScores {
  const counts = {
    DEV: { correct: 0, total: 0 },
    CYBERSEC: { correct: 0, total: 0 },
    NETWORK: { correct: 0, total: 0 },
  };

  for (const result of results) {
    counts[result.category].total++;
    if (result.isCorrect) {
      counts[result.category].correct++;
    }
  }

  const toScore = (cat: keyof typeof counts): number => {
    const { correct, total } = counts[cat];
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  return {
    devScore: toScore("DEV"),
    cybersecScore: toScore("CYBERSEC"),
    networkScore: toScore("NETWORK"),
  };
}

/**
 * Returns which categories a user has mastered based on their scores.
 * Mastery threshold is defined in @cyberlearn/types (currently 70).
 */
export function getMasteredCategories(scores: CategoryScores): MasteredCategories {
  return {
    DEV: scores.devScore >= PLACEMENT_MASTERY_THRESHOLD,
    CYBERSEC: scores.cybersecScore >= PLACEMENT_MASTERY_THRESHOLD,
    NETWORK: scores.networkScore >= PLACEMENT_MASTERY_THRESHOLD,
  };
}

/**
 * Returns the recommended path slug for the highest-scoring category.
 * Returns null if no category reaches the mastery threshold.
 * Path slugs here are the defaults seeded in dev - they may differ in production.
 */
export function getRecommendedPathSlug(
  scores: CategoryScores,
  pathSlugs: { dev: string; cybersec: string; network: string },
): string | null {
  const mastered = getMasteredCategories(scores);

  // Recommend the path for the highest-scoring mastered category
  const candidates: { category: "DEV" | "CYBERSEC" | "NETWORK"; score: number }[] = [];

  if (mastered.CYBERSEC) candidates.push({ category: "CYBERSEC", score: scores.cybersecScore });
  if (mastered.DEV) candidates.push({ category: "DEV", score: scores.devScore });
  if (mastered.NETWORK) candidates.push({ category: "NETWORK", score: scores.networkScore });

  if (candidates.length === 0) return null;

  // Sort descending by score, pick the highest
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  if (!top) return null;

  switch (top.category) {
    case "DEV":
      return pathSlugs.dev;
    case "CYBERSEC":
      return pathSlugs.cybersec;
    case "NETWORK":
      return pathSlugs.network;
  }
}
