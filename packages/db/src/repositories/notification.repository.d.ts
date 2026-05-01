import type { Notification, NotificationType } from "@prisma/client";
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
export declare const notificationRepository: {
  findUnreadCount(userId: string): Promise<number>;
  findByUser(userId: string, limit?: number): Promise<NotificationItem[]>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  create(data: CreateNotificationData): Promise<string>;
};
export {};
//# sourceMappingURL=notification.repository.d.ts.map
