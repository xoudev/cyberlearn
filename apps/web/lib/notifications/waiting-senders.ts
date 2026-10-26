import { friendshipRepository } from "@cyberlearn/db";
import { friendRequestSender } from "@cyberlearn/lib/social/friendship";

/**
 * Who, among the senders of the friend requests listed, is still waiting on
 * the reader's answer: the notifications whose "Accepter" and "Refuser" still
 * mean something. A request answered from the friends panel or the profile,
 * or taken back, keeps its notification and loses its buttons.
 *
 * Read for the bell's panel and for the history page alike, each against the
 * rows it lists, so the same notice offers the same answer in both. Each
 * sender once, checked against the table rather than the notification.
 */
export async function waitingSendersAmong(
  userId: string,
  notifications: readonly { type: string; metadata?: unknown }[],
): Promise<string[]> {
  const senders = notifications.flatMap((item) => friendRequestSender(item) ?? []);
  const views = await friendshipRepository.viewsOf(userId, senders);
  return [...new Set(senders.filter((id) => views.get(id) === "incoming"))];
}
