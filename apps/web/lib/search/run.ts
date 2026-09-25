import { MIN_SEARCH_LENGTH, searchRepository } from "@cyberlearn/db";
import { buildGroups, type SearchGroup } from "./results";

/**
 * The search, for the navbar on the site (/api/search) and the app
 * (/api/mobile/search): the caller's own id scopes it, so a class's lessons
 * and somebody's notes cannot be reached by guessing a term. The term is
 * capped so a very long string cannot make the database work.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be verified.
 */

export const MAX_TERM_LENGTH = 80;

export async function searchFor(userId: string, rawTerm: string | null): Promise<SearchGroup[]> {
  const term = (rawTerm ?? "").slice(0, MAX_TERM_LENGTH).trim();
  if (term.length < MIN_SEARCH_LENGTH) return [];
  const rows = await searchRepository.search(userId, term);
  return buildGroups(rows, term);
}
