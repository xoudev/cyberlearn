/**
 * Pure helper for weekly-quest progress.
 *
 * Two update modes:
 *  - counter quests (lessons, perfect quiz, forum post): `amount` is added.
 *  - streak quest: `setTo` is the current streak; progress is monotonic within
 *    the week (it never drops if the streak later breaks).
 * The result is always clamped to [0, target].
 */
export function nextQuestProgress(
  prev: number,
  target: number,
  opts: { amount?: number; setTo?: number },
): number {
  const raw = opts.setTo !== undefined ? Math.max(prev, opts.setTo) : prev + (opts.amount ?? 1);
  return Math.min(target, Math.max(0, raw));
}
