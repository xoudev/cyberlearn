import { describe, expect, it } from "vitest";
import {
  flattenNotificationPages,
  NOTIFICATION_PAGE_SIZE,
  nextNotificationOffset,
  notificationRange,
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
