import { authRedirectSchema } from "@cyberlearn/types";
import { z } from "zod";

/**
 * Where an admin lands after signing in, and how that place survives the trip
 * through /login and /mfa.
 *
 * The console used to forget it: the middleware sent every turned-away request
 * to a bare /login, the sign-in action and both MFA screens went to /dashboard
 * whatever had been asked for, and a link to a ticket or a user's page from a
 * mail or a chat landed on the dashboard instead. The site already carried the
 * page along (`?redirectTo=` to /login, `?next=` to /mfa); the console now does
 * the same, with the same validation.
 *
 * Pure and free of server imports: the Edge middleware uses it too.
 */

export const ADMIN_HOME = "/dashboard";

/**
 * Why the middleware sent a request to /login, as `?error=` carries it. One
 * list for the middleware that writes the code and the page that reads it: the
 * page checks the query value against it rather than looking it up as it comes.
 */
export const loginErrorSchema = z.enum(["session_expired", "auth_unavailable"]);
export type LoginError = z.infer<typeof loginErrorSchema>;

/** Reachable without a session: the sign-in page and what crawlers read. */
export function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/robots.txt";
}

/** Reachable with a session that has not passed the TOTP step yet. */
export function isMfaPath(pathname: string): boolean {
  return pathname === "/mfa" || pathname.startsWith("/mfa/");
}

/** Any origin will do: only the path of a relative destination is read. */
const PARSE_BASE = "https://console.invalid";

/**
 * A destination the console can send somebody to after signing in: a local
 * path that passes `authRedirectSchema` (no other origin, no control character,
 * no backslash), and not one of the sign-in steps themselves, which would only
 * send the admin round again. Anything else is the dashboard.
 */
export function safeAdminRedirect(value: unknown): string {
  const parsed = authRedirectSchema.safeParse(value ?? ADMIN_HOME);
  if (!parsed.success) return ADMIN_HOME;
  const { pathname } = new URL(parsed.data, PARSE_BASE);
  if (pathname === "/" || isPublicPath(pathname) || isMfaPath(pathname)) return ADMIN_HOME;
  return parsed.data;
}

/**
 * `path` carrying the destination in `param`, or bare when the destination is
 * the dashboard anyway - a sign-in URL with nothing to add stays readable.
 */
export function withReturnPath(
  path: string,
  param: "redirectTo" | "next",
  destination: string,
): string {
  const safe = safeAdminRedirect(destination);
  if (safe === ADMIN_HOME) return path;
  return `${path}?${new URLSearchParams({ [param]: safe }).toString()}`;
}

/**
 * The page a turned-away request was after.
 *
 * A sign-in step is not a destination, but it carries one: /mfa?next=/users
 * sent back to /login keeps /users. The router's `_rsc` cache key is dropped;
 * it belongs to the request that was refused, not to the page.
 */
export function returnPathOf(url: URL): string {
  if (isMfaPath(url.pathname)) return safeAdminRedirect(url.searchParams.get("next"));
  if (isPublicPath(url.pathname)) return safeAdminRedirect(url.searchParams.get("redirectTo"));
  const search = new URLSearchParams(url.search);
  search.delete("_rsc");
  const query = search.toString();
  return safeAdminRedirect(query === "" ? url.pathname : `${url.pathname}?${query}`);
}
