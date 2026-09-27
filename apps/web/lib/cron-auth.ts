import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether a request carries the cron secret Vercel sends
 * (`Authorization: Bearer <CRON_SECRET>`).
 *
 * One copy for the four cron routes, which each had their own. Two things it
 * holds to:
 * - Closed without a secret: an empty CRON_SECRET would otherwise make
 *   `Bearer ` the password, and the crons open to anybody.
 * - Constant time: `===` stops at the first differing character, so how long
 *   a guess takes to be refused says how much of it was right. Both sides are
 *   hashed first, which gives timingSafeEqual the equal lengths it needs
 *   without the length itself leaking.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(provided), digest(`Bearer ${secret}`));
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
