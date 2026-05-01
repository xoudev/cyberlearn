"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSm2 = computeSm2;
/**
 * SuperMemo-2 spaced repetition algorithm.
 *
 * quality 0-1 → "forgot" (resets interval)
 * quality 2-3 → "hard / remembered with difficulty"
 * quality 4-5 → "good / easy"
 *
 * Min easeFactor clamped at 1.3 to avoid infinite tiny intervals.
 */
function computeSm2(quality, input) {
  const { easeFactor, intervalDays, repetitions } = input;
  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;
  let newInterval;
  let newReps;
  if (quality < 3) {
    newInterval = 1;
    newReps = 0;
  } else {
    newReps = repetitions + 1;
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(intervalDays * newEF);
  }
  const nextReviewAt = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);
  return { easeFactor: newEF, intervalDays: newInterval, repetitions: newReps, nextReviewAt };
}
//# sourceMappingURL=sm2.js.map
