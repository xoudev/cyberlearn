"use server";

import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import {
  friendshipRepository,
  notificationRepository,
  type NotificationItem,
} from "@cyberlearn/db";
import { friendRequestSender } from "@cyberlearn/lib/social/friendship";

export interface NotificationsResult {
  success: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
  /**
   * Who, among the senders of the friend requests listed, is still waiting on
   * the reader's answer: the notifications whose "Accepter" and "Refuser"
   * still mean something. A request answered from the friends panel or the
   * profile, or taken back, keeps its notification and loses its buttons.
   */
  waitingSenders?: string[];
  error?: string;
}

export async function getNotificationsAction(): Promise<NotificationsResult> {
  const user = await requireRequestUser();
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.findByUser(user.id, 20),
    notificationRepository.findUnreadCount(user.id),
  ]);
  const senders = notifications.flatMap((item) => friendRequestSender(item) ?? []);
  const views = await friendshipRepository.viewsOf(user.id, senders);
  const waitingSenders = senders.filter((id) => views.get(id) === "incoming");
  return {
    success: true,
    notifications,
    unreadCount,
    waitingSenders: [...new Set(waitingSenders)],
  };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<{ success: boolean }> {
  const user = await requireRequestUser();
  const parsed = z.guid().safeParse(notificationId);
  if (!parsed.success) return { success: false };
  await notificationRepository.markAsRead(notificationId, user.id);
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<{ success: boolean }> {
  const user = await requireRequestUser();
  await notificationRepository.markAllAsRead(user.id);
  return { success: true };
}
