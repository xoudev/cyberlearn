"use server";

import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { notificationRepository, type NotificationItem } from "@cyberlearn/db";
import {
  cursorFromJson,
  cursorToJson,
  NOTIFICATION_HISTORY_PAGE,
  notificationHistoryRequestSchema,
  type NotificationCursorJson,
} from "@/lib/notifications/history";

export interface NotificationsResult {
  success: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
  error?: string;
}

export async function getNotificationsAction(): Promise<NotificationsResult> {
  const user = await requireRequestUser();
  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.findByUser(user.id, 20),
    notificationRepository.findUnreadCount(user.id),
  ]);
  return { success: true, notifications, unreadCount };
}

export type NotificationPageResult =
  | { success: true; notifications: NotificationItem[]; next: NotificationCursorJson | null }
  | { success: false };

/**
 * The history's next rows, after the last one shown: the account's own, the
 * unread ones alone when the page filters on them.
 */
export async function getNotificationPageAction(input: unknown): Promise<NotificationPageResult> {
  const user = await requireRequestUser();
  const parsed = notificationHistoryRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false };
  const page = await notificationRepository.findPage(user.id, {
    before: cursorFromJson(parsed.data.before),
    take: NOTIFICATION_HISTORY_PAGE,
    unreadOnly: parsed.data.unreadOnly,
  });
  return { success: true, notifications: page.items, next: cursorToJson(page.next) };
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
