import { LESSON_REF_CODE } from "@cyberlearn/types";

/**
 * Path 99 is the showcase: `content/lessons/_vitrine/99001-vitrine-des-composants.mdx`
 * holds CL-LSN-99001-V01, and the sync imports it as a draft like any other
 * lesson. Its numbers stay taken, but they are not where the catalogue ends:
 * following them would propose CL-LSN-99002-V01, a second showcase lesson,
 * instead of the next lesson of the real catalogue.
 */
const SHOWCASE_PATH_START = 99_000;

/** The highest five-digit number a proposal may use, below the showcase. */
const CATALOGUE_MAX = SHOWCASE_PATH_START - 1;

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
 * code of the catalogue, the showcase path left aside, when there is one;
 * otherwise it continues the three-digit series. A number counts as taken
 * whatever its version, so the proposal is always a fresh `-V01`. NNN is a
 * lesson's place within its path and starts at 001, so 000 is never proposed.
 */
export function nextLessonRefCode(taken: readonly string[]): string {
  const short = new Set<number>();
  const long = new Set<number>();
  for (const code of taken) {
    const digits = LESSON_REF_CODE.exec(code)?.[1];
    if (digits === undefined) continue;
    (digits.length === 5 ? long : short).add(Number(digits));
  }
  const catalogue = [...long].filter((n) => n < SHOWCASE_PATH_START);

  if (catalogue.length === 0 && short.size > 0) {
    const next = firstFree(short, Math.max(...short) + 1, 999);
    if (next !== null) return format(next, 3);
  }

  const start = catalogue.length > 0 ? Math.max(...catalogue) + 1 : 1001;
  const next = firstFree(long, start, CATALOGUE_MAX) ?? firstFree(long, 1001, CATALOGUE_MAX);
  // Every catalogue number taken is close to a hundred thousand lessons: not
  // a case the form has to handle beyond not crashing.
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
