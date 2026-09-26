import type { Category, Difficulty, SearchRows } from "@cyberlearn/db";
import { excerptAround, rankMatches } from "@cyberlearn/lib";

/**
 * Database rows turned into the rows a person reads: a title, a line of
 * context, a link, and the badge saying what kind of thing it is.
 *
 * Kept apart from both the query and the component so the ordering can be
 * tested without a database and without a browser - the two things that made
 * the old search untestable, and it showed: it promised "lessons, paths, badges"
 * and submitted to /lessons?q=, which searched lessons.
 */

export type SearchKind = "path" | "lesson" | "note";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  /** The line under the title: a description, or the matching bit of a note. */
  subtitle: string;
  href: string;
  /**
   * What the app opens it by: a path's or a lesson's slug, a note's lesson id
   * (the app's note screen is per lesson). The site uses `href`.
   */
  ref: string;
  /** The short facts on the right: lesson count, duration, word count. */
  meta: string;
  category: Category | null;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  results: SearchResult[];
}

/** How many of each kind the panel shows. The rest are behind "voir tout". */
const PER_KIND = 5;

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

function hours(value: number): string {
  return value >= 1 ? `${String(value)} h` : "< 1 h";
}

function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count > 1 ? many : one}`;
}

/**
 * The groups, in the order they are shown: parcours first.
 *
 * That order is the point rather than a detail. A parcours is the thing this
 * site is for - a lesson on its own is a page, a parcours is a course - so when
 * a term matches both, the parcours is what the reader is offered first.
 */
export function buildGroups(rows: SearchRows, query: string, perKind = PER_KIND): SearchGroup[] {
  const paths = rankMatches(
    rows.paths.map((p) => ({ ...p, body: p.description })),
    query,
    perKind,
  ).map<SearchResult>((p) => ({
    kind: "path",
    id: p.id,
    title: p.title,
    subtitle: p.description,
    href: `/paths/${p.slug}`,
    ref: p.slug,
    meta: `${plural(p.lessonCount, "leçon", "leçons")} · ${hours(p.estimatedHours)} · ${DIFFICULTY_LABEL[p.difficulty]}`,
    category: p.category,
  }));

  const lessons = rankMatches(
    rows.lessons.map((l) => ({ ...l, body: l.description })),
    query,
    perKind,
  ).map<SearchResult>((l) => ({
    kind: "lesson",
    id: l.id,
    title: l.title,
    subtitle: l.description,
    href: `/lessons/${l.slug}`,
    ref: l.slug,
    meta: `${String(l.estimatedMinutes)} min · ${DIFFICULTY_LABEL[l.difficulty]}`,
    category: l.category,
  }));

  // A note has no title of its own, so it borrows its lesson's: that is how
  // people refer to them anyway ("ma note sur l'injection SQL").
  const notes = rankMatches(
    rows.notes.map((n) => ({ ...n, title: n.lessonTitle, body: n.content })),
    query,
    perKind,
  ).map<SearchResult>((n) => ({
    kind: "note",
    id: n.id,
    title: n.lessonTitle,
    subtitle: excerptAround(n.content, query),
    href: `/notes?note=${encodeURIComponent(n.id)}`,
    ref: n.lessonId,
    meta: plural(n.wordCount, "mot", "mots"),
    category: n.lessonCategory,
  }));

  const groups: SearchGroup[] = [
    { kind: "path", label: "Parcours", results: paths },
    { kind: "lesson", label: "Leçons", results: lessons },
    { kind: "note", label: "Mes notes", results: notes },
  ];
  return groups.filter((group) => group.results.length > 0);
}

/** The results as one flat list, in the order the arrow keys walk them. */
export function flatten(groups: SearchGroup[]): SearchResult[] {
  return groups.flatMap((group) => group.results);
}
