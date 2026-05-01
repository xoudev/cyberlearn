"use server";

import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { notificationRepository, type NotificationItem } from "@cyberlearn/db";

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

export async function markNotificationReadAction(
  notificationId: string,
): Promise<{ success: boolean }> {
  const user = await requireRequestUser();
  const parsed = z.string().uuid().safeParse(notificationId);
  if (!parsed.success) return { success: false };
  await notificationRepository.markAsRead(notificationId, user.id);
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<{ success: boolean }> {
  const user = await requireRequestUser();
  await notificationRepository.markAllAsRead(user.id);
  return { success: true };
}
