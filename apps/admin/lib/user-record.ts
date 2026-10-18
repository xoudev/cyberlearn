import {
  EXAM_TIME_LIMIT_MINUTES,
  QUIZ_COOLDOWN_MINUTES,
  cooldownEndsAt,
  isExpired,
} from "@cyberlearn/lib/quiz/quiz";
import { AVATAR_PATHS, UPLOADED_AVATAR_PREFIX } from "@cyberlearn/types";

/**
 * What the account's page in the console says about values it does not show
 * as such: an avatar, and the wait after an exam. Pure, so it is tested.
 */

/** The marker of a glyph avatar, as the site stores it (see UPLOADED_AVATAR_PREFIX). */
const GLYPH_AVATAR_PREFIX = "__glyph:";

/**
 * An avatar, named for support. The console does not draw it: an uploaded
 * picture would need a signed link to the private bucket for one glance, and
 * what support decides is whether to remove it, which the name is enough for.
 */
export function avatarLabel(avatarUrl: string | null): string {
  if (avatarUrl === null || avatarUrl === "") return "Aucun : ses initiales";
  if (avatarUrl.startsWith(UPLOADED_AVATAR_PREFIX)) return "Photo envoyée";
  if (avatarUrl.startsWith(GLYPH_AVATAR_PREFIX)) return "Glyphe";
  const builtIn = (AVATAR_PATHS as readonly string[]).indexOf(avatarUrl);
  if (builtIn !== -1) return `Avatar intégré n° ${String(builtIn + 1)}`;
  if (/^https?:\/\//u.test(avatarUrl)) return "Image d'un compte lié (GitHub)";
  return "Autre";
}

/** Where a path's exam stands after the latest attempt at it. */
export type ExamWait =
  /** Started, never handed in, and still in its time. */
  | { state: "running" }
  /**
   * Started, never handed in, and out of time: a connection lost during the
   * exam. The next start closes it and only then begins the wait.
   */
  | { state: "expired" }
  /** Handed in: the next attempt opens at `until`. */
  | { state: "waiting"; until: Date }
  /** Handed in, and an administrator lifted the wait at `at`. */
  | { state: "waived"; at: Date }
  /** Handed in, and the wait is over. */
  | { state: "open" };

/** The exam's own rules (isExpired, cooldownEndsAt), read for the console. */
export function examWait(
  attempt: { startedAt: Date; submittedAt: Date | null; cooldownWaivedAt: Date | null },
  now: Date,
): ExamWait {
  if (attempt.submittedAt === null) {
    return isExpired(attempt, now, EXAM_TIME_LIMIT_MINUTES)
      ? { state: "expired" }
      : { state: "running" };
  }
  if (attempt.cooldownWaivedAt !== null) return { state: "waived", at: attempt.cooldownWaivedAt };
  const until = cooldownEndsAt(attempt, QUIZ_COOLDOWN_MINUTES);
  return until !== null && until.getTime() > now.getTime()
    ? { state: "waiting", until }
    : { state: "open" };
}

/**
 * The name of the GDPR export the console downloads for an account: the
 * account's id, so two exports on one desk are not mixed up, and the day in
 * Paris, like the audit log's export.
 */
export function userExportFilename(userId: string, now: Date): string {
  const day = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `cyberlearn-export-${userId}-${day}.json`;
}
