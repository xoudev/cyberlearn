import { lessonRepository, ticketRepository, userRepository } from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import type { ConsoleSearchResults } from "@/lib/command-palette";
import {
  CONSOLE_SEARCH_TAKE,
  consoleSearchSchema,
  lessonHit,
  ticketHit,
  userHit,
} from "@/lib/console-search";

import { requireAdminAction } from "@/lib/auth";

/** Nothing here is for a cache: the rows change, and they name people. */
const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * The accounts, lessons and tickets the top bar's quick search offers for a
 * term, a few of each.
 *
 * The same check as every console page, first: middleware lets a signed-in
 * session through, and this is what makes it an administrator's. A route
 * rather than a Server Action: actions from one page run one after another,
 * and a search typed letter by letter has to drop the request it no longer
 * needs, which a fetch does with its AbortSignal.
 *
 * The term is never logged: it is often somebody's address or name.
 */
export async function GET(request: Request): Promise<Response> {
  await requireAdminAction();

  const parsed = consoleSearchSchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return Response.json(
      { error: "La recherche demande entre 2 et 100 caractères." },
      { status: 400, headers: NO_STORE },
    );
  }

  const term = parsed.data.q;
  try {
    const [users, lessons, tickets] = await Promise.all([
      userRepository.searchForConsole(term, CONSOLE_SEARCH_TAKE),
      lessonRepository.searchForConsole(term, CONSOLE_SEARCH_TAKE),
      ticketRepository.searchForConsole(term, CONSOLE_SEARCH_TAKE),
    ]);
    const results: ConsoleSearchResults = {
      users: users.map(userHit),
      lessons: lessons.map(lessonHit),
      tickets: tickets.map(ticketHit),
    };
    return Response.json(results, { headers: NO_STORE });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "console search failed");
    return Response.json(
      { error: "La recherche a échoué. Réessaie." },
      { status: 500, headers: NO_STORE },
    );
  }
}
