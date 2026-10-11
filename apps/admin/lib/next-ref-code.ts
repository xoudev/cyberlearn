import { LESSON_REF_CODE } from "@cyberlearn/types";

/**
 * The refCode the new-lesson form proposes, from every lesson code already
 * taken.
 *
 * It used to sort the codes as strings and read only the three-digit shape.
 * Once the newest code was `CL-LSN-PPNNN`, the regex missed, the fallback was
 * `CL-LSN-001-V01`, which the first catalogue already holds, and the form
 * proposed a code its own save refused.
 *
 * Both shapes are read as numbers. The proposal follows the highest five-digit
 * code, the new catalogue's shape, when there is one; otherwise it continues
 * the three-digit series. A number counts as taken whatever its version, so
 * the proposal is always a fresh `-V01`. NNN is a lesson's place within its
 * path and starts at 001, so 000 is never proposed.
 */
export function nextLessonRefCode(taken: readonly string[]): string {
  const short = new Set<number>();
  const long = new Set<number>();
  for (const code of taken) {
    const digits = LESSON_REF_CODE.exec(code)?.[1];
    if (digits === undefined) continue;
    (digits.length === 5 ? long : short).add(Number(digits));
  }

  if (long.size === 0 && short.size > 0) {
    const next = firstFree(short, Math.max(...short) + 1, 999);
    if (next !== null) return format(next, 3);
  }

  const start = long.size > 0 ? Math.max(...long) + 1 : 1001;
  const next = firstFree(long, start, 99_999) ?? firstFree(long, 1001, 99_999);
  // Every five-digit number taken is a hundred thousand lessons: not a case
  // the form has to handle beyond not crashing.
  return format(next ?? 1001, 5);
}

/** The first number from `start` up to `max` that is free and not a lesson 000. */
function firstFree(taken: ReadonlySet<number>, start: number, max: number): number | null {
  for (let n = start; n <= max; n += 1) {
    if (n % 1000 !== 0 && !taken.has(n)) return n;
  }
  return null;
}

function format(n: number, width: 3 | 5): string {
  return `CL-LSN-${String(n).padStart(width, "0")}-V01`;
}
