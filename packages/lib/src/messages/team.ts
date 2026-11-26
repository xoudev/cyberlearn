/**
 * The learner's conversation with the team, as the console reads it: whether
 * a message from the team has been seen, and when.
 *
 * A message from the team reaches the learner twice: in the conversation (the
 * messages panel) and as a notification, the same text (for the app, which
 * has no messages screen yet). Either one read is the message seen. The app
 * marks its notifications read on its own, straight through the Data API, so
 * the console reads both rather than relying on one being kept in step.
 */

/** The notification's title: the message itself is its body. */
export const TEAM_NOTICE_TITLE = "Message de l'équipe CyberLearn";

/** A read notification of a message from the team, as its metadata names it. */
export interface TeamNoticeRead {
  readAt: Date;
  conversationId: string;
  /** The message it carried; null on notices sent before it was recorded. */
  messageId: string | null;
}

/** A notification's metadata and read date, as a team notice; null when it is not one. */
export function readTeamNotice(metadata: unknown, readAt: Date | null): TeamNoticeRead | null {
  if (readAt === null || typeof metadata !== "object" || metadata === null) return null;
  const conversationId: unknown = Reflect.get(metadata, "teamConversationId");
  const messageId: unknown = Reflect.get(metadata, "messageId");
  if (typeof conversationId !== "string") return null;
  return { readAt, conversationId, messageId: typeof messageId === "string" ? messageId : null };
}

/**
 * When a message from the team was seen, at the earliest the console can
 * tell; null when nothing says it was.
 *
 * - the moment the learner first opened the conversation after it (`seenAt`,
 *   stamped on the message);
 * - its own notification, read;
 * - for a message from before `seenAt` was recorded, the conversation read
 *   since it was sent (`conversationReadAt` is the last read, so the message
 *   was seen by then), or one of this conversation's notices read after it.
 */
export function teamMessageSeenAt(
  message: { id: string; createdAt: Date; seenAt?: Date | null },
  conversationReadAt: Date | null,
  notices: readonly TeamNoticeRead[],
): Date | null {
  const moments: Date[] = [];
  const stamped = message.seenAt ?? null;
  if (stamped !== null) {
    moments.push(stamped);
  } else if (conversationReadAt !== null && conversationReadAt >= message.createdAt) {
    moments.push(conversationReadAt);
  }
  for (const notice of notices) {
    if (notice.messageId === message.id) moments.push(notice.readAt);
    else if (notice.messageId === null && notice.readAt >= message.createdAt) {
      moments.push(notice.readAt);
    }
  }
  if (moments.length === 0) return null;
  return moments.reduce((a, b) => (a < b ? a : b));
}
