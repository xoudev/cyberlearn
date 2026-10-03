import { headers } from "next/headers";
import { logger } from "@cyberlearn/lib/logger";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

/**
 * The logger for the request being served: every line it writes carries the
 * request's id, set by the middleware (lib/request-id.ts).
 *
 * Outside a request (a script, a test, work that runs after the response) there
 * is no id to give, and the plain logger comes back. Lines logged from inside
 * the packages (packages/db, packages/lib) go through the plain logger too:
 * they do not know which request they serve.
 */
export async function requestLogger(): Promise<typeof logger> {
  try {
    const id = (await headers()).get(REQUEST_ID_HEADER);
    return id === null ? logger : logger.child({ requestId: id });
  } catch {
    return logger;
  }
}
