import { MIN_SEARCH_LENGTH, searchRepository } from "@cyberlearn/db";
import { getRequestUser } from "@/lib/auth";
import { buildGroups } from "@/lib/search/results";

/**
 * What the search box in the navbar calls on every keystroke (debounced).
 *
 * Signed-in only, and scoped to the caller: the repository takes the caller's
 * own id, so a class's lessons and somebody's notes cannot be reached by
 * guessing a query string. There is nothing to rate-limit beyond that - the
 * queries are two indexed reads and a bounded scan - but the term is capped so
 * a very long string cannot be used to make the database do work.
 */

const MAX_TERM_LENGTH = 80;

export async function GET(request: Request): Promise<Response> {
  const user = await getRequestUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const term = (new URL(request.url).searchParams.get("q") ?? "").slice(0, MAX_TERM_LENGTH).trim();
  if (term.length < MIN_SEARCH_LENGTH) {
    return Response.json({ groups: [] });
  }

  const rows = await searchRepository.search(user.id, term);
  return Response.json({ groups: buildGroups(rows, term) });
}
