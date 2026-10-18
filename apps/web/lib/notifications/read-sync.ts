import type { NotificationItem } from "@cyberlearn/db";

/**
 * The bell's panel and the history page (/notifications) both list the
 * reader's notifications and count the unread ones, each in its own state.
 * The panel lives in the navbar, which a move between pages does not reload,
 * and reads its count once: marking rows read on the page left the badge
 * counting them. Now whichever of the two marks notifications read says so on
 * the window, and the other follows.
 */

export const NOTIFICATIONS_READ_EVENT = "cyberlearn:notifications-read";

/** Who marked them, so that a list does not apply its own news a second time. */
export type ReadSource = "panel" | "history";

/** Some notifications, by id, or every unread one. */
export type ReadNews =
  | { source: ReadSource; ids: readonly string[] }
  | { source: ReadSource; all: true };

function isReadNews(value: unknown): value is ReadNews {
  if (typeof value !== "object" || value === null || !("source" in value)) return false;
  if (value.source !== "panel" && value.source !== "history") return false;
  if ("all" in value) return value.all === true;
  return (
    "ids" in value && Array.isArray(value.ids) && value.ids.every((id) => typeof id === "string")
  );
}

/** Tells the other list that notifications were marked read here. */
export function announceRead(news: ReadNews): void {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT, { detail: news }));
}

/** Calls `handler` with what the other list marked read; returns what stops listening. */
export function onReadElsewhere(self: ReadSource, handler: (news: ReadNews) => void): () => void {
  const listener = (event: Event): void => {
    if (!(event instanceof CustomEvent)) return;
    const detail: unknown = event.detail;
    if (!isReadNews(detail) || detail.source === self) return;
    handler(detail);
  };
  window.addEventListener(NOTIFICATIONS_READ_EVENT, listener);
  return () => {
    window.removeEventListener(NOTIFICATIONS_READ_EVENT, listener);
  };
}

/** The rows a list shows, with the ones marked read elsewhere read here too. */
export function markItemsRead(
  items: readonly NotificationItem[],
  news: ReadNews,
  now: Date,
): NotificationItem[] {
  const ids = "all" in news ? null : new Set(news.ids);
  return items.map((n) =>
    !n.readAt && (ids === null || ids.has(n.id)) ? { ...n, readAt: now } : n,
  );
}

/**
 * The unread count once notifications were marked read elsewhere. A row this
 * list already shows read was counted out already, so it is not taken off a
 * second time; one it does not show (older than its page) is taken off.
 */
export function unreadAfter(
  unread: number,
  items: readonly NotificationItem[],
  news: ReadNews,
): number {
  if ("all" in news) return 0;
  const alreadyRead = new Set(items.filter((n) => Boolean(n.readAt)).map((n) => n.id));
  const fresh = new Set(news.ids.filter((id) => !alreadyRead.has(id))).size;
  return Math.max(0, unread - fresh);
}
