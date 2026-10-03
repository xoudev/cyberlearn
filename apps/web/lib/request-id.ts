/**
 * The id a request carries through the server, so that the lines it logs can
 * be read together (docs/security/logging.md).
 *
 * The middleware sets it on the request it forwards, overwriting whatever the
 * client sent: an id the client chose could be made to look like another
 * request's. It is also returned on the response, so that somebody reporting
 * a problem can quote it.
 *
 * Edge-safe: the middleware imports it.
 */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Vercel's own id for the request when it is there, so that a line found in
 * our logs leads to the same request in the host's; a fresh UUID otherwise
 * (local development, tests).
 */
export function requestIdFor(request: Request): string {
  const vercelId = request.headers.get("x-vercel-id");
  return vercelId !== null && /^[\w:-]{8,128}$/u.test(vercelId) ? vercelId : crypto.randomUUID();
}
