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
export declare function computePlacementScores(results: QuestionResult[]): CategoryScores;
/**
 * Returns which categories a user has mastered based on their scores.
 * Mastery threshold is defined in @cyberlearn/types (currently 70).
 */
export declare function getMasteredCategories(scores: CategoryScores): MasteredCategories;
/**
 * Returns the recommended path slug for the highest-scoring category.
 * Returns null if no category reaches the mastery threshold.
 * Path slugs here are the defaults seeded in dev — they may differ in production.
 */
export declare function getRecommendedPathSlug(
  scores: CategoryScores,
  pathSlugs: {
    dev: string;
    cybersec: string;
    network: string;
  },
): string | null;
//# sourceMappingURL=scoring.d.ts.map
