import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The bell's list, with the friend requests whose notice can still be
 * answered, and the notification history's "Charger plus": the rows after the
 * last one shown, the account's own, and nothing for a cursor that does not
 * parse.
 */

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string }>>(),
  findByUser: vi.fn<(userId: string, limit: number) => Promise<unknown[]>>(),
  findUnreadCount: vi.fn<(userId: string) => Promise<number>>(),
  findPage: vi.fn(),
  viewsOf: vi.fn<(userId: string, ids: readonly string[]) => Promise<Map<string, string>>>(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@cyberlearn/db", () => ({
  notificationRepository: {
    findByUser: m.findByUser,
    findUnreadCount: m.findUnreadCount,
    findPage: m.findPage,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
  friendshipRepository: { viewsOf: m.viewsOf },
}));

const { getNotificationsAction, getNotificationPageAction } = await import(
  "../notification-actions"
);
const { cursorFromJson, cursorToJson, NOTIFICATION_HISTORY_PAGE, unreadOnlyParam } = await import(
  "@/lib/notifications/history"
);

const ME = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";
const LOU = "33333333-3333-4333-8333-333333333333";
const LAST = "44444444-4444-4444-8444-444444444444";
const AT = new Date("2026-10-17T09:00:00.000Z");

function request(id: string, metadata: unknown): Record<string, unknown> {
  return { id, type: "FRIEND_REQUEST", metadata };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: ME });
  m.findUnreadCount.mockResolvedValue(2);
  m.findPage.mockResolvedValue({ items: [], next: null });
  m.viewsOf.mockResolvedValue(new Map());
});

describe("getNotificationsAction", () => {
  it("names the senders still waiting, read against the table, each once", async () => {
    m.findByUser.mockResolvedValue([
      request("n1", { fromUserId: SAM }),
      request("n2", { fromUserId: LOU }),
      request("n3", { fromUserId: SAM }),
      request("n4", null),
      { id: "n5", type: "DUEL_INVITE", metadata: { fromUserId: LOU } },
    ]);
    // Sam still waits; Lou's request was accepted from the friends panel.
    m.viewsOf.mockResolvedValue(
      new Map([
        [SAM, "incoming"],
        [LOU, "friends"],
      ]),
    );
    const result = await getNotificationsAction();
    expect(m.viewsOf).toHaveBeenCalledWith(ME, [SAM, LOU, SAM]);
    expect(result.waitingSenders).toEqual([SAM]);
    expect(result.notifications).toHaveLength(5);
  });

  it("asks nothing more when no request is listed", async () => {
    m.findByUser.mockResolvedValue([{ id: "n1", type: "LEVEL_UP", metadata: null }]);
    m.viewsOf.mockResolvedValue(new Map());
    expect((await getNotificationsAction()).waitingSenders).toEqual([]);
  });
});

describe("getNotificationPageAction", () => {
  it("reads the signed-in account's rows after the cursor", async () => {
    m.findPage.mockResolvedValue({ items: [], next: { createdAt: AT, id: LAST } });
    const res = await getNotificationPageAction({
      before: { createdAt: AT.toISOString(), id: LAST },
      unreadOnly: true,
    });
    expect(m.findPage).toHaveBeenCalledWith(ME, {
      before: { createdAt: AT, id: LAST },
      take: NOTIFICATION_HISTORY_PAGE,
      unreadOnly: true,
    });
    expect(res).toEqual({
      success: true,
      notifications: [],
      next: { createdAt: AT.toISOString(), id: LAST },
      waitingSenders: [],
    });
  });

  it("names, as the panel does, the senders among its rows still waiting", async () => {
    m.findPage.mockResolvedValue({
      items: [request("n1", { fromUserId: SAM }), request("n2", { fromUserId: LOU })],
      next: null,
    });
    m.viewsOf.mockResolvedValue(
      new Map([
        [SAM, "friends"],
        [LOU, "incoming"],
      ]),
    );
    const res = await getNotificationPageAction({
      before: { createdAt: AT.toISOString(), id: LAST },
      unreadOnly: false,
    });
    expect(m.viewsOf).toHaveBeenCalledWith(ME, [SAM, LOU]);
    expect(res).toMatchObject({ success: true, waitingSenders: [LOU] });
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
    expect(m.viewsOf).not.toHaveBeenCalled();
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
