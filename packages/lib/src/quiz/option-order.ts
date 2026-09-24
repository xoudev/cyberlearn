/**
 * The order a learner sees a quiz's options in.
 *
 * Authors put the right answer second far more often than anywhere else: 61%
 * of the 567 lesson quizzes answer B, and three answer D. Picking B without
 * reading scored better than chance. Each learner now sees the options in an
 * order of their own, drawn from a seed (who they are, which lesson, which
 * quiz), so the same learner sees the same order on every visit and on both
 * apps, and the position of the right answer tells nothing.
 *
 * The order is display only. What is sent, stored and scored is the option's
 * index as written, so answers already on record keep their meaning.
 *
 * An option that refers to the others ("Aucune des trois", "Toutes les
 * réponses ci-dessus") keeps its written place: moved above them, it would
 * read wrong.
 *
 * Pure and dependency-free: the site and the mobile app both import it.
 */

const POSITIONAL = [
  /^(aucune?|toutes?|tous)\s+(des|les|de ces)\s+(deux|trois|quatre|réponses|propositions|options|précédente?s?)\b/i,
  /\bci-(dessus|dessous)\b/i,
];

/** Whether an option's meaning depends on where it sits among the others. */
export function isPositionalOption(text: string): boolean {
  const t = text.trim();
  return POSITIONAL.some((re) => re.test(t));
}

/** FNV-1a, 32 bits: a stable number from the seed text. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** mulberry32: a small generator, the same sequence everywhere for a seed. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The written indices of the options, in display order: `order[position]` is
 * the index of the option shown at `position`.
 */
export function quizOptionOrder(options: readonly string[], seed: string): number[] {
  const order = options.map((_, i) => i);
  const movable = order.filter((i) => !isPositionalOption(options[i] ?? ""));
  const random = generator(hash(seed));
  // Fisher-Yates over the movable options only.
  const shuffled = [...movable];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = shuffled[i] ?? 0;
    shuffled[i] = shuffled[j] ?? 0;
    shuffled[j] = tmp;
  }
  // Put them back into the movable slots; positional options keep theirs.
  let next = 0;
  return order.map((i) => (isPositionalOption(options[i] ?? "") ? i : (shuffled[next++] ?? i)));
}

/** The seed of one quiz for one learner. */
export function quizOrderSeed(userId: string, lessonId: string, quizId: string): string {
  return `${userId}:${lessonId}:${quizId}`;
}
