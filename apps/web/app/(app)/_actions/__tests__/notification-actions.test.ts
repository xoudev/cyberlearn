import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string }>>(),
  findByUser: vi.fn<(userId: string, limit: number) => Promise<unknown[]>>(),
  findUnreadCount: vi.fn<(userId: string) => Promise<number>>(),
  viewsOf: vi.fn<(userId: string, ids: readonly string[]) => Promise<Map<string, string>>>(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@cyberlearn/db", () => ({
  notificationRepository: { findByUser: m.findByUser, findUnreadCount: m.findUnreadCount },
  friendshipRepository: { viewsOf: m.viewsOf },
}));

const { getNotificationsAction } = await import("../notification-actions");

/**
 * The bell's list, with the friend requests whose notice can still be
 * answered: those whose sender still waits on the reader.
 */

const ME = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";
const LOU = "33333333-3333-4333-8333-333333333333";

function request(id: string, metadata: unknown): Record<string, unknown> {
  return { id, type: "FRIEND_REQUEST", metadata };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: ME });
  m.findUnreadCount.mockResolvedValue(2);
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
