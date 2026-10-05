/**
 * What <PutInOrder> and <MatchPairs> share: the order the items are shown in,
 * and the reading of what the learner placed.
 *
 * The shown order is drawn from the exercise's id, so the server and the
 * client render the same thing, every learner sees the same shuffle, and the
 * tests know it. It is a derangement: no item sits at its own place, so no
 * position is right by accident before the learner has moved anything.
 *
 * Pure and dependency-free: the site and the mobile app both import it.
 */

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
 * The indices 0 to count-1 in the order they are shown, none at its own
 * index (Sattolo's algorithm: one cycle through every item). A single item
 * stays where it is.
 */
export function shownOrder(count: number, seed: string): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  const random = generator(hash(seed));
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * i);
    const tmp = order[i] ?? 0;
    order[i] = order[j] ?? 0;
    order[j] = tmp;
  }
  return order;
}

/** A slot holds the index of the item placed there, or nothing yet. */
export type Slot = number | null;

/** Whether every slot is filled: the learner can ask for a check. */
export function isComplete(slots: readonly Slot[]): boolean {
  return slots.every((slot) => slot !== null);
}

/** Slot by slot, whether the item placed there is the one that belongs there (index i at position i). */
export function verdicts(slots: readonly Slot[]): boolean[] {
  return slots.map((slot, i) => slot === i);
}

/** The slots after a check: the right ones kept, the wrong ones emptied. */
export function keepRight(slots: readonly Slot[]): Slot[] {
  return slots.map((slot, i) => (slot === i ? slot : null));
}

/** The items not placed in any slot, in their shown order. */
export function remaining(order: readonly number[], slots: readonly Slot[]): number[] {
  return order.filter((index) => !slots.includes(index));
}

/** A generator seeded by a text: the same sequence everywhere for the same text. */
export function randomFromText(seed: string): () => number {
  return generator(hash(seed));
}
