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

/**
 * How many notifications a GDPR export lists, the most recent ones: the
 * export says so in its metadata (rgpd/build-export.ts).
 */
export const NOTIFICATION_EXPORT_LIMIT = 1000;

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

/** One row of a batch: what create takes, with metadata already JSON. */
export interface NotificationRow {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  metadata?: Prisma.InputJsonObject;
}

/** The trace a batch writes with it, in the same transaction. */
export interface NotificationBatchAudit {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: Prisma.InputJsonObject;
}

/**
 * Rows per INSERT. A statement carries one bind parameter per column per row,
 * and Postgres stops at 65,535 of them: everyone on the platform in one
 * statement would pass that long before the table notices.
 */
export const NOTIFICATION_BATCH_SIZE = 1_000;

/** A batch to every account is many statements; the 5 s default is too short. */
const CREATE_MANY_TIMEOUT_MS = 60_000;

function batchesOf<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    out.push(items.slice(start, start + size));
  }
  return out;
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

  /**
   * Many notifications at once, `batchSize` rows per INSERT, and the number
   * written.
   *
   * Every batch runs in one transaction: an announcement either reaches
   * everyone it was sent to or nobody, so a failure can be sent again without
   * the first half of the list getting it twice. The audit row, when given,
   * lands in the same transaction, the way changeRole writes its own: a
   * message to thousands of accounts with no trace of who sent it is what the
   * log exists to rule out, and the console's history of announcements is
   * read from it.
   */
  async createMany(
    rows: readonly NotificationRow[],
    options: { batchSize?: number; audit?: NotificationBatchAudit } = {},
  ): Promise<number> {
    const batchSize = options.batchSize ?? NOTIFICATION_BATCH_SIZE;
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new RangeError(`batchSize must be a positive integer, got ${String(batchSize)}`);
    }
    const { audit } = options;
    if (rows.length === 0 && audit === undefined) return 0;

    return prisma.$transaction(
      async (tx) => {
        let written = 0;
        for (const batch of batchesOf(rows, batchSize)) {
          const { count } = await tx.notification.createMany({
            data: batch.map((row) => ({
              userId: row.userId,
              type: row.type,
              title: row.title,
              body: row.body,
              actionUrl: row.actionUrl ?? null,
              ...(row.metadata !== undefined ? { metadata: row.metadata } : {}),
            })),
          });
          written += count;
        }
        if (audit !== undefined) {
          await tx.auditLog.create({
            data: {
              actorId: audit.actorId,
              action: audit.action,
              targetType: audit.targetType,
              targetId: audit.targetId ?? null,
              metadata: audit.metadata,
            },
          });
        }
        return written;
      },
      { timeout: CREATE_MANY_TIMEOUT_MS },
    );
  },

  /** The account's latest notifications, newest first, for its GDPR export (rgpd/build-export.ts). */
  async exportFor(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { scheduledFor: "desc" },
      take: NOTIFICATION_EXPORT_LIMIT,
      select: {
        type: true,
        title: true,
        body: true,
        actionUrl: true,
        scheduledFor: true,
        sentAt: true,
        readAt: true,
      },
    });
  },
};
