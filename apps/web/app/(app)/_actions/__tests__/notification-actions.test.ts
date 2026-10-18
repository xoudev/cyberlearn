import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The notification history's "Charger plus": the rows after the last one
 * shown, the account's own, and nothing for a cursor that does not parse.
 */

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string }>>(),
  findPage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@cyberlearn/db", () => ({
  notificationRepository: {
    findPage: m.findPage,
    findByUser: vi.fn(),
    findUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const { getNotificationPageAction } = await import("../notification-actions");
const { cursorFromJson, cursorToJson, NOTIFICATION_HISTORY_PAGE, unreadOnlyParam } = await import(
  "@/lib/notifications/history"
);

const USER = "11111111-1111-4111-8111-111111111111";
const LAST = "22222222-2222-4222-8222-222222222222";
const AT = new Date("2026-10-17T09:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: USER });
  m.findPage.mockResolvedValue({ items: [], next: null });
});

describe("getNotificationPageAction", () => {
  it("reads the signed-in account's rows after the cursor", async () => {
    m.findPage.mockResolvedValue({ items: [], next: { createdAt: AT, id: LAST } });
    const res = await getNotificationPageAction({
      before: { createdAt: AT.toISOString(), id: LAST },
      unreadOnly: true,
    });
    expect(m.findPage).toHaveBeenCalledWith(USER, {
      before: { createdAt: AT, id: LAST },
      take: NOTIFICATION_HISTORY_PAGE,
      unreadOnly: true,
    });
    expect(res).toEqual({
      success: true,
      notifications: [],
      next: { createdAt: AT.toISOString(), id: LAST },
    });
  });

  it("refuses a cursor that does not parse, without reading anything", async () => {
    for (const input of [
      null,
      { before: { createdAt: "hier", id: LAST }, unreadOnly: false },
      { before: { createdAt: AT.toISOString(), id: "1 OR 1=1" }, unreadOnly: false },
      { before: { createdAt: AT.toISOString(), id: LAST } },
    ]) {
      expect(await getNotificationPageAction(input)).toEqual({ success: false });
    }
    expect(m.findPage).not.toHaveBeenCalled();
  });
});

describe("the history's paging helpers", () => {
  it("carries a cursor through JSON and back", () => {
    const json = cursorToJson({ createdAt: AT, id: LAST });
    expect(json).toEqual({ createdAt: "2026-10-17T09:00:00.000Z", id: LAST });
    expect(json === null ? null : cursorFromJson(json)).toEqual({ createdAt: AT, id: LAST });
    expect(cursorToJson(null)).toBeNull();
  });

  it("filters on the unread rows for ?unread=1 alone", () => {
    expect(unreadOnlyParam("1")).toBe(true);
    expect(unreadOnlyParam(["1", "0"])).toBe(true);
    expect(unreadOnlyParam("true")).toBe(false);
    expect(unreadOnlyParam(undefined)).toBe(false);
  });
});
