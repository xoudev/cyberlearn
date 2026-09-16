import crypto from "node:crypto";

/**
 * HMAC-SHA256 under a server-side salt, for values that must be traceable
 * without being readable: IP addresses in audit rows, an e-mail used as a rate
 * limit key, the id of an account that no longer exists.
 *
 * Shared rather than per-app because it was already written twice - once here
 * for the web app, once inline in the admin rate limiter with a comment
 * pointing at the other one. Two implementations of a security primitive is
 * one too many: they can be given different salts, or one of them can be
 * "temporarily" weakened, and nothing says so.
 *
 * It fails closed. A hardcoded fallback salt would be public knowledge, so the
 * hash would be reversible for any IPv4 by trying four billion of them - that
 * is not pseudonymization, and refusing to start is better than pretending.
 *
 * Reached through @cyberlearn/lib/pseudonymize and deliberately NOT re-exported
 * from the package index: the index is imported by client components, and
 * node:crypto in a browser bundle fails the build. Which is the right failure -
 * the salt is a server secret and this must never ship to a browser - but it is
 * better read here than discovered from a webpack stack trace.
 */
export function getSalt(): string {
  const salt = process.env.IP_SALT;
  if (!salt || salt.length < 32) {
    throw new Error(
      "[pseudonymize] IP_SALT must be set (>= 32 chars). Generate with: openssl rand -hex 32",
    );
  }
  return salt;
}

export function pseudonymize(value: string): string {
  return crypto.createHmac("sha256", getSalt()).update(value).digest("hex");
}
