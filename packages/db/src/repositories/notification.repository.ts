import type { Notification, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export type NotificationItem = Pick<
  Notification,
  "id" | "type" | "title" | "body" | "actionUrl" | "readAt" | "createdAt" | "metadata"
>;

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export const notificationRepository = {
  async findUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  },

  async findByUser(userId: string, limit = 20): Promise<NotificationItem[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        actionUrl: true,
        readAt: true,
        createdAt: true,
        metadata: true,
      },
    });
  },

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async create(data: CreateNotificationData): Promise<string> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl ?? null,
        ...(data.metadata !== undefined
          ? { metadata: data.metadata as Prisma.InputJsonValue }
          : {}),
      },
      select: { id: true },
    });
    return notification.id;
  },
};
