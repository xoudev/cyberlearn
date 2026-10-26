import { describe, expect, it } from "vitest";
import {
  flattenNotificationPages,
  NOTIFICATION_PAGE_SIZE,
  nextNotificationOffset,
  notificationRange,
  unreadTotal,
} from "../notification-pages";

describe("the inbox's pages", () => {
  const full = Array.from({ length: NOTIFICATION_PAGE_SIZE }, (_, i) => ({ id: `n${String(i)}` }));

  it("offers the next page while the last one came back full", () => {
    expect(nextNotificationOffset([full])).toBe(NOTIFICATION_PAGE_SIZE);
    expect(nextNotificationOffset([full, full])).toBe(2 * NOTIFICATION_PAGE_SIZE);
  });

  it("stops once a page came back short, or there is none", () => {
    expect(nextNotificationOffset([full, full.slice(0, 3)])).toBeUndefined();
    expect(nextNotificationOffset([[]])).toBeUndefined();
    expect(nextNotificationOffset([])).toBeUndefined();
  });

  it("reads a page of rows, both ends included", () => {
    expect(notificationRange(0)).toEqual([0, 49]);
    expect(notificationRange(50)).toEqual([50, 99]);
  });

  it("shows once a row that slid onto the next page", () => {
    expect(
      flattenNotificationPages([
        [{ id: "a" }, { id: "b" }],
        [{ id: "b" }, { id: "c" }],
      ]),
    ).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });
});

describe("the inbox's unread count", () => {
  const read = { readAt: "2026-10-20T08:00:00.000Z" };
  const unread = { readAt: null };

  it("counts every unread notice of the account, not only the pages loaded", () => {
    // Fifty read notices on screen, twelve unread ones further back: the bell says twelve.
    expect(
      unreadTotal(
        12,
        Array.from({ length: 50 }, () => read),
      ),
    ).toBe(12);
    expect(unreadTotal(12, [unread, read])).toBe(12);
  });

  it("falls back on the loaded pages until the server's count has arrived", () => {
    expect(unreadTotal(undefined, [unread, unread, read])).toBe(2);
    expect(unreadTotal(undefined, [])).toBe(0);
  });

  it("never says fewer than the list shows unread", () => {
    // A notice that came in after the count was read.
    expect(unreadTotal(1, [unread, unread, read])).toBe(2);
  });

  it("says none when nothing is unread anywhere", () => {
    expect(unreadTotal(0, [read, read])).toBe(0);
  });
});
