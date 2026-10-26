/**
 * The inbox's pages: fifty notifications at a time, as many as the screen
 * showed in all before, and "Charger plus" for the ones after.
 *
 * Pure, so the paging is tested without Supabase (queries.ts reads it).
 */

export const NOTIFICATION_PAGE_SIZE = 50;

/**
 * Where the next page starts, as a row offset, or undefined once a page came
 * back short: the history has nothing older.
 */
export function nextNotificationOffset(
  pages: readonly (readonly unknown[])[],
  pageSize: number = NOTIFICATION_PAGE_SIZE,
): number | undefined {
  const last = pages.at(-1);
  if (last === undefined || last.length < pageSize) return undefined;
  return pages.length * pageSize;
}

/** The rows a page reads: Supabase's range is inclusive at both ends. */
export function notificationRange(
  offset: number,
  pageSize: number = NOTIFICATION_PAGE_SIZE,
): [from: number, to: number] {
  return [offset, offset + pageSize - 1];
}

/**
 * The pages as one list. A notice that arrived between two pages pushes the
 * rows down by one, and the next page then starts with a row already shown:
 * it is shown once.
 */
export function flattenNotificationPages<T extends { id: string }>(
  pages: readonly (readonly T[])[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const page of pages) {
    for (const item of page) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/**
 * How many notices are unread, for the inbox's heading and its "Tout marquer
 * lu": the count of every row the server holds, the number the home tab's
 * bell announces, and not only the ones among the pages loaded so far. After
 * an absence, or fifty notices read one by one, the unread ones sit on pages
 * not yet loaded, and a count of what is on screen would say none while the
 * bell says twelve.
 *
 * The server's count is read apart and arrives late or not at all: until it
 * has, and below what the list itself shows unread (a notice that arrived
 * since the count was read), the loaded pages' own count stands in.
 */
export function unreadTotal(
  serverCount: number | undefined,
  loaded: readonly { readAt: string | null }[],
): number {
  const onScreen = loaded.filter((notice) => notice.readAt === null).length;
  return Math.max(serverCount ?? 0, onScreen);
}
