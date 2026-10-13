/**
 * What the console's lists share: one page of rows out of a filtered whole.
 *
 * The lists used to load every row and let the browser filter and page them.
 * That holds while there are a few hundred accounts, and the audit log had
 * already outgrown it: it showed the last 500 entries and nothing before. Each
 * list now asks the database for one page under its filters, with the count of
 * everything those filters match.
 */

export type SortDir = "asc" | "desc";

export interface ConsolePage {
  /** Counted from 1. */
  page: number;
  pageSize: number;
}

export interface ConsoleSlice<T> {
  rows: T[];
  /** Rows matching the filters, over every page. */
  total: number;
  /** The page returned: one past the end falls back to the last. */
  page: number;
}

/** The last page a total spreads over, and 1 for an empty list. */
export function lastPage(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Counts, then reads the requested page, or the last one when the request
 * points past the end: a filter narrowed while page 9 was open would
 * otherwise show an empty list over a count that says there are rows.
 */
export async function readSlice<T>(
  { page, pageSize }: ConsolePage,
  count: () => Promise<number>,
  read: (window: { skip: number; take: number }) => Promise<T[]>,
): Promise<ConsoleSlice<T>> {
  const total = await count();
  const effective = Math.min(Math.max(1, page), lastPage(total, pageSize));
  const rows = total === 0 ? [] : await read({ skip: (effective - 1) * pageSize, take: pageSize });
  return { rows, total, page: effective };
}
