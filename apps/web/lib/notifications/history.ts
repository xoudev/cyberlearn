import { z } from "zod";
import type { NotificationCursor } from "@cyberlearn/db";

/**
 * The notification history's paging, shared by its page and the action that
 * loads the next rows: how many a page holds, the filter the URL carries, and
 * the cursor the client hands back, checked before it reaches a query.
 */

/** Rows the page opens with, and each "Charger plus" adds. */
export const NOTIFICATION_HISTORY_PAGE = 30;

/** The cursor as it travels between the client and the action: plain JSON. */
export interface NotificationCursorJson {
  createdAt: string;
  id: string;
}

export const notificationCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.guid(),
});

export const notificationHistoryRequestSchema = z.object({
  before: notificationCursorSchema,
  unreadOnly: z.boolean(),
});

export function cursorToJson(cursor: NotificationCursor | null): NotificationCursorJson | null {
  return cursor === null ? null : { createdAt: cursor.createdAt.toISOString(), id: cursor.id };
}

export function cursorFromJson(cursor: NotificationCursorJson): NotificationCursor {
  return { createdAt: new Date(cursor.createdAt), id: cursor.id };
}

/** "?unread=1" shows the unread notices alone; anything else, all of them. */
export function unreadOnlyParam(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === "1";
}
