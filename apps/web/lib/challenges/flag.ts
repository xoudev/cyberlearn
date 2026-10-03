import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The learner's own flag for a challenge played on a Linux machine.
 *
 * The machine runs in the browser, so its files can be read by digging into
 * the page: a single flag shared by everyone would be found once and passed
 * around. Each learner gets theirs instead, an HMAC of the challenge and the
 * learner under CHALLENGE_FLAG_SECRET, which the server puts into the machine
 * where the author wrote {{FLAG}} and recomputes to check an answer. A flag
 * copied from someone else's machine does not match.
 *
 * 20 hex characters, 80 bits: guessing is out of reach, and the flag still
 * fits on a line and in a learner's clipboard.
 */
export function personalFlag(secret: string, challengeId: string, userId: string): string {
  const mac = createHmac("sha256", secret).update(`ctf:${challengeId}:${userId}`).digest("hex");
  return `CL{${mac.slice(0, 20)}}`;
}

/**
 * Whether an answer is the expected flag: spaces around ignored, case too (a
 * learner retyping hex in capitals has found it all the same), compared in
 * constant time.
 */
export function flagsMatch(submitted: string, expected: string): boolean {
  const a = Buffer.from(submitted.trim().toLowerCase());
  const b = Buffer.from(expected.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
