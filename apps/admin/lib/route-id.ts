import { notFound } from "next/navigation";
import { z } from "zod";

/**
 * The `[id]` of a console URL, checked before it reaches a query.
 *
 * Every table a console page opens by id keys on a Postgres uuid. Handed
 * anything else - /users/abc, or the eight characters the audit log shows of
 * an id - Postgres refuses the cast, the query throws, and the page turned
 * into the global error screen, a 500 without the console around it, where a
 * 404 was due. guid, not uuid: Postgres takes any 8-4-4-4-12 hex string, and
 * so do the fixed ids the seed writes, which carry no RFC version.
 */
const routeIdSchema = z.guid();

export function isRouteId(value: string): boolean {
  return routeIdSchema.safeParse(value).success;
}

/** The id itself, or the console's 404 for a value that cannot be one. */
export function routeIdOrNotFound(value: string): string {
  if (!isRouteId(value)) notFound();
  return value;
}
