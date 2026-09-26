/**
 * The site's navbar search in the app. What matches, in which order and for
 * whom is the server's (apps/web/lib/search/run.ts, through
 * /api/mobile/search); this module says where a result opens in the app.
 */

export type SearchKind = "path" | "lesson" | "note";

export interface SearchResultItem {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  /** A path's or a lesson's slug; a note's lesson id. */
  ref: string;
  meta: string;
  category: "DEV" | "CYBERSEC" | "NETWORK" | null;
}

export interface SearchGroupItem {
  kind: SearchKind;
  label: string;
  results: SearchResultItem[];
}

/** The server's MIN_SEARCH_LENGTH: below it nothing is asked. */
const MIN_SEARCH_LENGTH = 2;

/** Long enough to stop typing, short enough not to feel like waiting: the site's. */
export const SEARCH_DEBOUNCE_MS = 200;

export const SEARCH_COPY = {
  placeholder: "Rechercher un parcours, une leçon, une note…",
  hint: "Deux lettres suffisent. Les parcours viennent d'abord, puis les leçons, puis tes notes.",
  empty: (term: string): string => `Aucun résultat pour « ${term} ».`,
} as const;

/** Whether a term is long enough to be sent. */
export function isSearchable(term: string): boolean {
  return term.trim().length >= MIN_SEARCH_LENGTH;
}

export type SearchTarget =
  | { pathname: "/paths/[slug]"; params: { slug: string } }
  | { pathname: "/lessons/[slug]"; params: { slug: string } }
  | { pathname: "/notes/[lessonId]"; params: { lessonId: string; title: string } };

/** The app screen a result opens: the parcours, the lesson, or the note on its lesson. */
export function searchTarget(result: SearchResultItem): SearchTarget {
  switch (result.kind) {
    case "path":
      return { pathname: "/paths/[slug]", params: { slug: result.ref } };
    case "lesson":
      return { pathname: "/lessons/[slug]", params: { slug: result.ref } };
    case "note":
      return {
        pathname: "/notes/[lessonId]",
        params: { lessonId: result.ref, title: result.title },
      };
  }
}
