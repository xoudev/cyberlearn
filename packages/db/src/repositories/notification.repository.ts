import type { Notification, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export type NotificationItem = Pick<
  Notification,
  "id" | "type" | "title" | "body" | "actionUrl" | "readAt" | "createdAt" | "metadata"
>;

/** Where a page of notifications stops: the last one shown, by its date and id. */
export interface NotificationCursor {
  createdAt: Date;
  id: string;
}

export interface NotificationPageQuery {
  /** The page after this one; none for the newest. */
  before: NotificationCursor | undefined;
  take: number;
  unreadOnly: boolean;
}

export interface NotificationPage {
  items: NotificationItem[];
  /** Where the next page starts, or null when this one is the last. */
  next: NotificationCursor | null;
}

/** The largest page a caller may ask for. */
export const NOTIFICATION_PAGE_MAX = 50;

const NOTIFICATION_ITEM = {
  id: true,
  type: true,
  title: true,
  body: true,
  actionUrl: true,
  readAt: true,
  createdAt: true,
  metadata: true,
} as const satisfies Prisma.NotificationSelect;

/**
 * The notifications a page shows: the account's own, the unread ones alone
 * when asked, and only those older than the cursor. Keyed on the date and the
 * id rather than counted by offset: a notice that arrives while the history
 * is open lands at the top, and would otherwise push a row of page one onto
 * page two, shown twice.
 */
export function notificationPageWhere(
  userId: string,
  query: Pick<NotificationPageQuery, "before" | "unreadOnly">,
): Prisma.NotificationWhereInput {
  const terms: Prisma.NotificationWhereInput[] = [{ userId }];
  if (query.unreadOnly) terms.push({ readAt: null });
  if (query.before !== undefined) {
    terms.push({
      OR: [
        { createdAt: { lt: query.before.createdAt } },
        { createdAt: query.before.createdAt, id: { lt: query.before.id } },
      ],
    });
  }
  return { AND: terms };
}

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
      select: NOTIFICATION_ITEM,
    });
  },

  /**
   * One page of the account's history, the newest first, every notice it
   * still has rather than the panel's last twenty. One row more than the page
   * is read, to know whether another page follows without counting them all.
   */
  async findPage(userId: string, query: NotificationPageQuery): Promise<NotificationPage> {
    const take = Math.min(Math.max(1, Math.trunc(query.take)), NOTIFICATION_PAGE_MAX);
    const rows = await prisma.notification.findMany({
      where: notificationPageWhere(userId, query),
      // The id settles notices written in the same millisecond, as the cursor does.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      select: NOTIFICATION_ITEM,
    });
    const items = rows.slice(0, take);
    const last = items.at(-1);
    return {
      items,
      next:
        rows.length > take && last !== undefined
          ? { createdAt: last.createdAt, id: last.id }
          : null,
    };
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
