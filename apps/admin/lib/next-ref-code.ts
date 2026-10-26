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

// ── From a path ───────────────────────────────────────────────────────────────

const PATH_NUMBER = /^CL-PATH-(\d{3})-V\d{2}$/;

/** The showcase's PP, which no path of the catalogue hands out. */
const SHOWCASE_PREFIX = SHOWCASE_PATH_START / 1000;

/**
 * The last NNN of an ordinary lesson: 901 and up are the module recaps
 * (CL-LSN-02901-V01 closes the first module of Linux, docs/curriculum).
 */
const LAST_LESSON_NUMBER = 900;

/**
 * The PP a path gives its lessons: its number less 100. CL-PATH-102-V01 is
 * Linux, whose lessons are CL-LSN-02001… (content/paths/linux.json). A path of
 * the first catalogue (001 to 099), the showcase's 199 and anything else that
 * maps outside 01 to 98 gives none.
 */
export function pathLessonPrefix(pathRefCode: string): number | null {
  const digits = PATH_NUMBER.exec(pathRefCode)?.[1];
  if (digits === undefined) return null;
  const prefix = Number(digits) - 100;
  return prefix >= 1 && prefix < SHOWCASE_PREFIX ? prefix : null;
}

/** The PP of a five-digit lesson code, null for any other shape. */
export function lessonCodePrefix(refCode: string): number | null {
  const digits = LESSON_REF_CODE.exec(refCode)?.[1];
  return digits?.length === 5 ? Math.floor(Number(digits) / 1000) : null;
}

/**
 * The NNN a lesson takes in the path `pathRefCode` after the lessons `ahead`
 * (their codes, those placed before it): one past the highest ordinary number
 * of the path's own range among them, 1 when there is none.
 *
 * NNN is a lesson's rank in its path, and the module recaps are not ranked:
 * they take 901 and up (docs/LESSON_AUTHORING_GUIDE.md). Counting the path's
 * rows counted them too. Linux holds 90 rows, ten of them recaps, and its last
 * lesson is 02080: the next one is 02081, where the row count proposed 02091
 * and left a gap of ten. A lesson borrowed from another path's range or from
 * the first catalogue keeps its own code and leaves this range alone, so it
 * is not ranked either.
 */
export function nextPathLessonNumber(pathRefCode: string, ahead: readonly string[]): number {
  const prefix = pathLessonPrefix(pathRefCode);
  let highest = 0;
  for (const code of ahead) {
    const digits = LESSON_REF_CODE.exec(code)?.[1];
    if (digits?.length !== 5) continue;
    const n = Number(digits);
    if (Math.floor(n / 1000) !== prefix) continue;
    const rank = n % 1000;
    if (rank <= LAST_LESSON_NUMBER) highest = Math.max(highest, rank);
  }
  return highest + 1;
}

/**
 * The code of a lesson whose rank in the path `pathRefCode` is `position`
 * (1-based, nextPathLessonNumber): CL-LSN-PPNNN-V01. When that number is
 * taken, whatever its version, the next free one of the path's range,
 * wrapping back to 001; the recap numbers (901 and up) are left to the
 * recaps. Null when the path gives no prefix or its range is full: the caller
 * falls back on nextLessonRefCode.
 */
export function lessonRefCodeFor(
  pathRefCode: string,
  position: number,
  taken: readonly string[],
): string | null {
  const prefix = pathLessonPrefix(pathRefCode);
  if (prefix === null) return null;
  const used = new Set<number>();
  for (const code of taken) {
    const digits = LESSON_REF_CODE.exec(code)?.[1];
    if (digits?.length === 5) used.add(Number(digits));
  }
  const base = prefix * 1000;
  const start = Math.min(Math.max(Math.trunc(position), 1), LAST_LESSON_NUMBER);
  const free =
    firstFree(used, base + start, base + LAST_LESSON_NUMBER) ??
    firstFree(used, base + 1, base + start - 1);
  return free === null ? null : format(free, 5);
}

/** Where an existing lesson sits: a path's code and the lessons before it. */
export interface LessonPlacement {
  pathRefCode: string;
  /** The codes of the lessons placed before it in that path. */
  ahead: readonly string[];
}

/**
 * The code the console proposes for a lesson that already exists, or null to
 * propose nothing.
 *
 * Nothing changes by itself: the manifests and the sync know a lesson by its
 * code, so this is a suggestion the admin takes or leaves. It is made only for
 * a five-digit code that sits in none of its paths' ranges, typically a lesson
 * created before it had a path. A lesson already numbered in one of its paths
 * keeps its code, and the first catalogue's three digits and a class lesson's
 * CL-CLS are never touched. The first placement given names the path, and
 * comes back with the code so the console can say where it is from.
 */
export function suggestLessonRefCode<P extends LessonPlacement>(
  current: string,
  placements: readonly P[],
  taken: readonly string[],
): { refCode: string; from: P } | null {
  const currentPrefix = lessonCodePrefix(current);
  if (currentPrefix === null) return null;
  const numbered = placements.filter((p) => pathLessonPrefix(p.pathRefCode) !== null);
  if (numbered.some((p) => pathLessonPrefix(p.pathRefCode) === currentPrefix)) return null;
  const first = numbered[0];
  if (first === undefined) return null;
  const others = taken.filter((code) => code !== current);
  const rank = nextPathLessonNumber(first.pathRefCode, first.ahead);
  const refCode = lessonRefCodeFor(first.pathRefCode, rank, others);
  return refCode === null ? null : { refCode, from: first };
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
