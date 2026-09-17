import { foldText } from "./fold.js";

/**
 * How results are ordered and excerpted, with no database and no React in
 * sight, so it can be tested for what it is: a ranking.
 *
 * The database says what matches. This says what matters. Those are different
 * questions - "sql" matches a lesson called "Injection SQL" and a lesson whose
 * description mentions SQL in passing, and only one of them is what the reader
 * meant.
 */

export interface Rankable {
  /** What the result is called. Weighted far above the body. */
  title: string;
  /** The rest of the searchable text: a description, a note's contents. */
  body: string;
}

/** Best first. The numbers are ordinal - only their order is meaningful. */
const EXACT_TITLE = 100;
const TITLE_PREFIX = 80;
const TITLE_WORD = 60;
const TITLE_ANYWHERE = 40;
const BODY = 20;
const NO_MATCH = 0;

/**
 * How well one item answers a query.
 *
 * A title that *is* the query beats a title that starts with it, which beats a
 * title where a word starts with it ("injection" finding "Injection SQL" and
 * "Les bases de l'injection" both, in that order), which beats a title that
 * merely contains it, which beats a match buried in the body.
 */
export function scoreMatch(item: Rankable, query: string): number {
  const q = foldText(query.trim());
  if (q.length === 0) return NO_MATCH;

  const title = foldText(item.title);
  if (title === q) return EXACT_TITLE;
  if (title.startsWith(q)) return TITLE_PREFIX;

  const at = title.indexOf(q);
  if (at > 0) {
    // A word boundary, in the sense that matters for a title: the character
    // before it is not a letter or a digit.
    const before = title.charAt(at - 1);
    return /[\p{L}\p{N}]/u.test(before) ? TITLE_ANYWHERE : TITLE_WORD;
  }

  return foldText(item.body).includes(q) ? BODY : NO_MATCH;
}

/**
 * The matching items, best first, capped.
 *
 * Ties break on the shorter title and then alphabetically, so the same query
 * over the same data always produces the same list - a search whose order
 * shifts under the cursor is worse than no search.
 */
export function rankMatches<T extends Rankable>(items: T[], query: string, limit: number): T[] {
  return items
    .map((item) => ({ item, score: scoreMatch(item, query) }))
    .filter((entry) => entry.score > NO_MATCH)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.title.length - b.item.title.length ||
        a.item.title.localeCompare(b.item.title, "fr"),
    )
    .slice(0, limit)
    .map((entry) => entry.item);
}

/**
 * The original string folded, plus where each folded character came from.
 *
 * Folding can change a string's length, so an index into the folded text is not
 * an index into the original. Excerpting the wrong slice of somebody's note is
 * a small bug that looks like a big one, hence the map.
 */
function foldWithMap(value: string): { folded: string; map: number[] } {
  let folded = "";
  let index = 0;
  const map: number[] = [];
  // By code point rather than by UTF-16 unit, so a character outside the basic
  // plane is folded whole; index advances by the original character's length so
  // the offsets it records stay offsets into `value`.
  for (const char of value) {
    const piece = foldText(char);
    folded += piece;
    map.push(...new Array<number>(piece.length).fill(index));
    index += char.length;
  }
  return { folded, map };
}

/** Markdown left in an excerpt reads as noise, so the syntax goes and the words stay. */
function flatten(value: string): string {
  return value
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/`([^`]*)`/gu, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gmu, "")
    .replace(/^\s{0,3}>\s?/gmu, "")
    .replace(/[*_~]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * A window of `content` around the first match, so a note shows the sentence
 * the term is in rather than its first line.
 *
 * Falls back to the beginning of the text when the term is not in the body at
 * all - which happens legitimately: a note matches because its lesson's title
 * matches.
 */
export function excerptAround(content: string, query: string, radius = 70): string {
  const flat = flatten(content);
  if (flat.length === 0) return "";

  const q = foldText(query.trim());
  const { folded, map } = foldWithMap(flat);
  const hit = q.length > 0 ? folded.indexOf(q) : -1;

  if (hit < 0) {
    return flat.length > radius * 2 ? `${flat.slice(0, radius * 2).trimEnd()}…` : flat;
  }

  const start = Math.max(0, (map[hit] ?? 0) - radius);
  const end = Math.min(flat.length, (map[hit] ?? 0) + q.length + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}
