/**
 * What finishing a lesson came to, read from /api/mobile/progress.
 *
 * Three outcomes, which the result screen words differently:
 *  - recorded: the completion is on record (or was already), with its reward;
 *  - refused: the server recorded nothing, for a reason a new try does not
 *    change, such as a lesson still locked in its path (the Lessons tab lists
 *    every lesson). It comes as a 403 or a 404 with the reason to show. It
 *    used to be an empty result, which the screen announced as saved, for 0 XP;
 *  - unsynced: no answer, or not one of the two above, which is worth retrying.
 */

export interface CompleteLessonResult {
  alreadyCompleted: boolean;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newBadges: { name: string; rarity: string; xpReward: number }[];
  /** Right answers out of the lesson's quizzes, fixed at completion. */
  quizScore?: { correct: number; total: number } | null;
}

export type CompletionReply =
  | { kind: "recorded"; result: CompleteLessonResult }
  | { kind: "refused"; message: string }
  | { kind: "unsynced" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The statuses the endpoint refuses with: 403 for a lesson still locked in
 * its path, 404 for one the reader may not open or an account with no row,
 * and 409, which an older server answered to every refusal. A 401 (session
 * gone) or a 500 stays worth a new try.
 */
const REFUSAL_STATUSES: ReadonlySet<number> = new Set([403, 404, 409]);

/** The outcome, from the endpoint's status and body. */
export function readCompletionReply(status: number, body: unknown): CompletionReply {
  if (!isRecord(body)) return { kind: "unsynced" };
  if (REFUSAL_STATUSES.has(status) && typeof body.error === "string" && body.error !== "") {
    return { kind: "refused", message: body.error };
  }
  if (body.ok === true && isRecord(body.result)) {
    // SAFETY: the site's CompleteLessonResult, which this interface mirrors.
    return { kind: "recorded", result: body.result as unknown as CompleteLessonResult };
  }
  return { kind: "unsynced" };
}
