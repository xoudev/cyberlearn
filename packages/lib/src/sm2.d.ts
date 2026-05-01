export interface Sm2Input {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}
export interface Sm2Result {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
}
/**
 * SuperMemo-2 spaced repetition algorithm.
 *
 * quality 0-1 → "forgot" (resets interval)
 * quality 2-3 → "hard / remembered with difficulty"
 * quality 4-5 → "good / easy"
 *
 * Min easeFactor clamped at 1.3 to avoid infinite tiny intervals.
 */
export declare function computeSm2(quality: 0 | 1 | 2 | 3 | 4 | 5, input: Sm2Input): Sm2Result;
//# sourceMappingURL=sm2.d.ts.map
