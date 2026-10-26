/**
 * Why a message its author can still see is out of the thread for everybody
 * else, in the words the site and the app share.
 *
 * Three different things leave the same trace on the row (`isHidden`), and the
 * author used to read all of them as "retiré":
 * - they took it down themselves, which is final;
 * - the screen held it, and a moderator has yet to read it;
 * - a moderator hid it from the console.
 * Someone told "retiré" about a message that is only waiting its turn writes
 * it again, and someone told it about a moderator's decision believes they
 * did it themselves.
 */

export type RemovalKind = "WITHDRAWN" | "HELD" | "MODERATED";

/**
 * Which of the three a message is, or null when it is up.
 *
 * `awaitingReview` is whether the screen's record of it is still in the
 * moderation queue: a message hidden without a moderator's hand and not
 * waiting there is one its author withdrew.
 */
export function removalKindOf(post: {
  isHidden: boolean;
  hiddenByModeration: boolean;
  awaitingReview: boolean;
}): RemovalKind | null {
  if (!post.isHidden) return null;
  if (post.hiddenByModeration) return "MODERATED";
  return post.awaitingReview ? "HELD" : "WITHDRAWN";
}

/** The mark beside the date on the site: « 12 octobre · retiré ». */
export const REMOVAL_TAG: Record<RemovalKind, string> = {
  WITHDRAWN: "retiré",
  HELD: "en attente de validation",
  MODERATED: "masqué par la modération",
};

/** The line above the message in the app, which has no room for a tag. */
export const REMOVAL_NOTICE: Record<RemovalKind, string> = {
  WITHDRAWN: "Retiré : toi seul le vois",
  HELD: "En attente de validation : toi seul le vois",
  MODERATED: "Masqué par la modération : toi seul le vois",
};

/** Whether a string read off the wire is one of the three, for the app. */
export function isRemovalKind(value: unknown): value is RemovalKind {
  return value === "WITHDRAWN" || value === "HELD" || value === "MODERATED";
}
