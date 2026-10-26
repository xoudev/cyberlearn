/**
 * A learner's notification history, a page at a time: the account's own
 * notices, the unread ones alone when asked, and a cursor on the date and the
 * id so a notice arriving at the top never pushes a row onto the next page.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTIFICATION_PAGE_MAX,
  notificationPageWhere,
  notificationRepository,
} from "../repositories/notification.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { notification: { findMany: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";
const AT = new Date("2026-10-17T09:00:00Z");

function row(id: string, minutesAgo: number) {
  return {
    id,
    type: "LEVEL_UP",
    title: id,
    body: "",
    actionUrl: null,
    readAt: null,
    createdAt: new Date(AT.getTime() - minutesAgo * 60_000),
    metadata: null,
  };
}

function firstArg(): Record<string, unknown> {
  const arg: unknown = mockPrisma.notification.findMany.mock.calls[0]?.[0];
  if (typeof arg !== "object" || arg === null) throw new Error("not called with an object");
  return { ...arg };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.notification.findMany.mockResolvedValue([]);
});

describe("notificationPageWhere", () => {
  it("keeps to the account's own notices", () => {
    expect(notificationPageWhere(USER, { before: undefined, unreadOnly: false })).toEqual({
      AND: [{ userId: USER }],
    });
  });

  it("reads the unread ones alone, older than the cursor, the id settling a tie", () => {
    expect(
      notificationPageWhere(USER, { before: { createdAt: AT, id: "n-9" }, unreadOnly: true }),
    ).toEqual({
      AND: [
        { userId: USER },
        { readAt: null },
        { OR: [{ createdAt: { lt: AT } }, { createdAt: AT, id: { lt: "n-9" } }] },
      ],
    });
  });
});

describe("notificationRepository.findPage", () => {
  it("reads one row more than the page, to know whether another follows", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([row("a", 1), row("b", 2), row("c", 3)]);
    const page = await notificationRepository.findPage(USER, {
      before: undefined,
      take: 2,
      unreadOnly: false,
    });
    expect(firstArg()).toMatchObject({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 3,
    });
    expect(page.items.map((n) => n.id)).toEqual(["a", "b"]);
    expect(page.next).toEqual({ createdAt: row("b", 2).createdAt, id: "b" });
  });

  it("has no next page once the history runs out", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([row("a", 1)]);
    const page = await notificationRepository.findPage(USER, {
      before: undefined,
      take: 2,
      unreadOnly: false,
    });
    expect(page).toEqual({ items: [row("a", 1)], next: null });
  });

  it("caps the page whatever the caller asks", async () => {
    await notificationRepository.findPage(USER, {
      before: undefined,
      take: 10_000,
      unreadOnly: false,
    });
    expect(firstArg()).toMatchObject({ take: NOTIFICATION_PAGE_MAX + 1 });
  });
});
