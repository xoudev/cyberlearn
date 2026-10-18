import type { ConsoleDestination } from "./console-nav";

/**
 * The quick search of the top bar (⌘K), without React: which pages match what
 * was typed, how the answers are grouped, and the one list the arrow keys walk
 * through. Pure, so the browser and the tests read the same rules.
 *
 * Pages and actions are matched here, in the browser, from console-nav.ts.
 * Accounts, lessons and tickets are searched on the server (POST /search),
 * once at least two characters are typed.
 */

/** Below this many characters, only pages and actions are searched. */
export const CONSOLE_SEARCH_MIN = 2;
/** Above this many, the server refuses the search. */
export const CONSOLE_SEARCH_MAX = 100;
/** How long typing has to pause before the server is asked. */
export const CONSOLE_SEARCH_DEBOUNCE_MS = 200;
/** Where the server search answers. */
export const CONSOLE_SEARCH_PATH = "/search";

/** One account, lesson or ticket the server found. */
export interface SearchHit {
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

/** What POST /search answers. */
export interface ConsoleSearchResults {
  users: SearchHit[];
  lessons: SearchHit[];
  tickets: SearchHit[];
}

/** Lower case, without accents: "Modération" is found by "moderation". */
export function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/gu, "");
}

/** A search term as the server reads it: trimmed, without a leading @. */
export function stripHandle(query: string): string {
  return query.trim().replace(/^@/u, "").trim();
}

/** The term to send to the server, or null when what was typed is too short or too long. */
export function remoteSearchTerm(query: string): string | null {
  const term = stripHandle(query);
  return term.length >= CONSOLE_SEARCH_MIN && term.length <= CONSOLE_SEARCH_MAX ? term : null;
}

/**
 * The destinations that match what was typed: every word of it has to be in
 * the label or the keywords. A label that starts with the query comes first,
 * then one that contains it, then a keyword match; the list's order otherwise.
 * Nothing typed matches everything.
 */
export function matchDestinations(
  query: string,
  destinations: readonly ConsoleDestination[],
): ConsoleDestination[] {
  const q = normalize(query.trim());
  if (q === "") return [...destinations];
  const words = q.split(/\s+/u);
  const rank = (destination: ConsoleDestination): number => {
    const label = normalize(destination.label);
    if (label.startsWith(q)) return 0;
    return label.includes(q) ? 1 : 2;
  };
  return destinations
    .filter((destination) => {
      const haystack = normalize([destination.label, ...destination.keywords].join(" "));
      return words.every((word) => haystack.includes(word));
    })
    .map((destination, index) => ({ destination, index, rank: rank(destination) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ destination }) => destination);
}

export type PaletteGroupId = "destinations" | "users" | "lessons" | "tickets";

/** One line of the list. */
export interface PaletteItem {
  /** Unique across the groups. */
  key: string;
  label: string;
  sublabel?: string;
  href: string;
  /** The word on the right: page, action, compte, leçon, ticket. */
  hint: string;
}

export interface PaletteGroup {
  id: PaletteGroupId;
  label: string;
  items: PaletteItem[];
}

const REMOTE_GROUPS = [
  { id: "users", label: "Utilisateurs", hint: "compte" },
  { id: "lessons", label: "Leçons", hint: "leçon" },
  { id: "tickets", label: "Tickets", hint: "ticket" },
] as const satisfies readonly { id: keyof ConsoleSearchResults; label: string; hint: string }[];

/**
 * The list as it is shown: the pages and actions first, then the accounts,
 * lessons and tickets the server found. A group with nothing in it is left
 * out rather than drawn empty.
 */
export function paletteGroups(
  destinations: readonly ConsoleDestination[],
  results: ConsoleSearchResults | null,
): PaletteGroup[] {
  const groups: PaletteGroup[] = [];
  if (destinations.length > 0) {
    groups.push({
      id: "destinations",
      label: "Pages et actions",
      items: destinations.map((destination) => ({
        key: `${destination.kind}:${destination.href}`,
        label: destination.label,
        href: destination.href,
        hint: destination.kind,
      })),
    });
  }
  if (results !== null) {
    for (const group of REMOTE_GROUPS) {
      const hits = results[group.id];
      if (hits.length === 0) continue;
      groups.push({
        id: group.id,
        label: group.label,
        items: hits.map((hit) => ({
          key: `${group.id}:${hit.id}`,
          label: hit.label,
          sublabel: hit.sublabel,
          href: hit.href,
          hint: group.hint,
        })),
      });
    }
  }
  return groups;
}

/** Every line of every group, in order: what the arrow keys walk through. */
export function flattenGroups(groups: readonly PaletteGroup[]): PaletteItem[] {
  return groups.flatMap((group) => group.items);
}

/** The next line for an arrow key, stopping at both ends. */
export function moveCursor(cursor: number, step: 1 | -1, length: number): number {
  if (length === 0) return 0;
  return Math.min(Math.max(cursor + step, 0), length - 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Any origin will do: only whether a path leaves it matters. */
const PATH_BASE = new URL("https://console.invalid");

/**
 * True for a path of this console, and nothing that leaves it. Checked by
 * resolving it the way the browser will, not by its first characters: the
 * URL parser reads "/\host" as "//host" and drops a tab or a line break,
 * so a prefix test lets those through to another host.
 */
export function isConsolePath(href: string): boolean {
  if (!href.startsWith("/")) return false;
  try {
    return new URL(href, PATH_BASE).origin === PATH_BASE.origin;
  } catch {
    return false;
  }
}

function isSearchHit(value: unknown): value is SearchHit {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.sublabel === "string" &&
    typeof value.href === "string" &&
    // The list turns it into a navigation.
    isConsolePath(value.href)
  );
}

function hitsOf(value: unknown): SearchHit[] | null {
  if (!Array.isArray(value)) return null;
  const items: unknown[] = value;
  const hits = items.filter(isSearchHit);
  return hits.length === items.length ? hits : null;
}

/** The server's answer, checked, or null when it is not one. */
export function parseSearchResults(value: unknown): ConsoleSearchResults | null {
  if (!isRecord(value)) return null;
  const users = hitsOf(value.users);
  const lessons = hitsOf(value.lessons);
  const tickets = hitsOf(value.tickets);
  if (users === null || lessons === null || tickets === null) return null;
  return { users, lessons, tickets };
}

/**
 * Asks the server for the accounts, lessons and tickets matching a term.
 * Throws when the answer is not one - a refusal, an expired session sent to
 * the sign-in page, a failure - and when the signal aborts it.
 *
 * The term goes in the body, never in the address: it is usually somebody's
 * e-mail or name, and an address is kept by the browser history, the host's
 * access logs and Sentry (fetch breadcrumbs, sampled spans, error replays),
 * which collects no body (lib/sentry/data-collection.ts).
 */
export async function fetchConsoleSearch(
  term: string,
  signal: AbortSignal,
): Promise<ConsoleSearchResults> {
  const response = await fetch(CONSOLE_SEARCH_PATH, {
    method: "POST",
    signal,
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ q: term }),
  });
  if (!response.ok) throw new Error(`search answered ${String(response.status)}`);
  const results = parseSearchResults(await response.json());
  if (results === null) throw new Error("search answered something else");
  return results;
}
