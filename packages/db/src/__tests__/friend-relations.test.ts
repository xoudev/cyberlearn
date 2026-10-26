/**
 * What the friends panel, the class list, the leaderboard and the dashboard
 * read about the reader's friends: the relation with each person listed
 * (viewsOf), whom a duel is open with (openOpponentsOf), the lists without a
 * hidden cap, and the friends' recent activity. Prisma is mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { duelRepository } from "../repositories/duel.repository.js";
import { friendshipRepository } from "../repositories/friendship.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    friendship: { findMany: vi.fn(), deleteMany: vi.fn() },
    duel: { findMany: vi.fn() },
    userLessonProgress: { findMany: vi.fn() },
    userBadge: { findMany: vi.fn() },
    certificate: { findMany: vi.fn() },
    userChallengeProgress: { findMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ME = "11111111-1111-4111-8111-111111111111";
const LOW = "00000000-0000-4000-8000-000000000000";
const HIGH = "99999999-9999-4999-8999-999999999999";
const MID = "55555555-5555-4555-8555-555555555555";

function actor(id: string, name: string) {
  return { id, username: name.toLowerCase(), displayName: name, avatarUrl: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const table of Object.values(mockPrisma)) table.findMany.mockResolvedValue([]);
  mockPrisma.friendship.deleteMany.mockResolvedValue({ count: 1 });
});

describe("viewsOf", () => {
  it("reads the rows between the reader and the people named, and nobody else", async () => {
    await friendshipRepository.viewsOf(ME, [LOW, HIGH, LOW, ME]);
    expect(mockPrisma.friendship.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userAId: ME, userBId: { in: [LOW, HIGH] } },
          { userBId: ME, userAId: { in: [LOW, HIGH] } },
        ],
      },
      select: { userAId: true, userBId: true, status: true, requestedById: true },
    });
  });

  it("says, from the reader's side, which of them asked and who is a friend", async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([
      { userAId: LOW, userBId: ME, status: "PENDING", requestedById: LOW },
      { userAId: ME, userBId: HIGH, status: "PENDING", requestedById: ME },
      { userAId: ME, userBId: MID, status: "ACCEPTED", requestedById: MID },
    ]);
    const views = await friendshipRepository.viewsOf(ME, [LOW, HIGH, MID]);
    expect(Object.fromEntries(views)).toEqual({
      [LOW]: "incoming",
      [HIGH]: "outgoing",
      [MID]: "friends",
    });
  });

  it("asks nothing when there is nobody to ask about", async () => {
    expect((await friendshipRepository.viewsOf(ME, [ME])).size).toBe(0);
    expect(mockPrisma.friendship.findMany).not.toHaveBeenCalled();
  });
});

describe("the lists, without a hidden cap", () => {
  it("reads every friend, every request received and sent, unless asked for fewer", async () => {
    await friendshipRepository.listFriends(ME);
    await friendshipRepository.listIncoming(ME);
    await friendshipRepository.listOutgoing(ME);
    for (const [query] of mockPrisma.friendship.findMany.mock.calls as [{ take?: number }][]) {
      expect(query.take).toBeUndefined();
    }
    await friendshipRepository.listFriends(ME, 200);
    const last = mockPrisma.friendship.findMany.mock.calls.at(-1) as [{ take?: number }];
    expect(last[0].take).toBe(200);
  });
});

describe("decline", () => {
  it("removes only a request still waiting that the other person sent", async () => {
    expect(await friendshipRepository.decline(ME, LOW)).toBe(true);
    // LOW sorts first: the pair is ordered whoever declines.
    expect(mockPrisma.friendship.deleteMany).toHaveBeenCalledWith({
      where: { userAId: LOW, userBId: ME, status: "PENDING", requestedById: LOW },
    });
  });

  it("says so when nothing was waiting: a friendship accepted meanwhile is left alone", async () => {
    mockPrisma.friendship.deleteMany.mockResolvedValue({ count: 0 });
    expect(await friendshipRepository.decline(ME, HIGH)).toBe(false);
    expect(await friendshipRepository.decline(ME, ME)).toBe(false);
  });
});

describe("openOpponentsOf", () => {
  it("reads the reader's open duels that still have time, on either side", async () => {
    const now = new Date("2026-10-17T10:00:00Z");
    mockPrisma.duel.findMany.mockResolvedValue([
      { challengerId: ME, opponentId: LOW },
      { challengerId: HIGH, opponentId: ME },
    ]);
    const open = await duelRepository.openOpponentsOf(ME, now);
    expect([...open].sort()).toEqual([LOW, HIGH]);
    expect(mockPrisma.duel.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ challengerId: ME }, { opponentId: ME }],
        status: { in: ["PENDING", "ACTIVE"] },
        expiresAt: { gt: now },
      },
      select: { challengerId: true, opponentId: true },
    });
  });
});

describe("recentFriendActivity", () => {
  it("reads nothing for a reader without friends", async () => {
    expect(await friendshipRepository.recentFriendActivity(ME, 6)).toEqual([]);
    expect(mockPrisma.userLessonProgress.findMany).not.toHaveBeenCalled();
  });

  it("merges the friends' moments, the most recent first, each source bounded", async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([{ userAId: LOW, userBId: ME }]);
    const alex = actor(LOW, "Alex");
    mockPrisma.userLessonProgress.findMany.mockResolvedValue([
      {
        id: "p1",
        completedAt: new Date("2026-10-10T10:00:00Z"),
        lesson: { title: "Les ports" },
        user: alex,
      },
    ]);
    mockPrisma.userBadge.findMany.mockResolvedValue([
      {
        id: "b1",
        earnedAt: new Date("2026-10-12T10:00:00Z"),
        badge: { name: "Premier pas" },
        user: alex,
      },
    ]);
    mockPrisma.certificate.findMany.mockResolvedValue([
      {
        id: "c1",
        issuedAt: new Date("2026-10-11T10:00:00Z"),
        path: { title: "Réseau" },
        user: alex,
      },
    ]);

    const rows = await friendshipRepository.recentFriendActivity(ME, 6);
    expect(rows.map((r) => [r.kind, r.title])).toEqual([
      ["badge", "Premier pas"],
      ["certificate", "Réseau"],
      ["lesson", "Les ports"],
    ]);
    expect(rows[0]?.friend.id).toBe(LOW);

    const [lessonQuery] = mockPrisma.userLessonProgress.findMany.mock.calls[0] as [
      { where: Record<string, unknown>; take: number },
    ];
    expect(lessonQuery.take).toBe(6);
    // A class's own lesson would say which class the friend is in.
    expect(lessonQuery.where).toMatchObject({
      userId: { in: [LOW] },
      status: "COMPLETED",
      lesson: { status: "PUBLISHED", audience: "CATALOGUE" },
    });
    const [certificateQuery] = mockPrisma.certificate.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(certificateQuery.where).toMatchObject({ revokedAt: null });
  });

  it("names the winner of a duel and never the other player", async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([{ userAId: LOW, userBId: ME }]);
    mockPrisma.duel.findMany.mockResolvedValue([
      {
        id: "d1",
        finishedAt: new Date("2026-10-12T10:00:00Z"),
        winnerId: LOW,
        path: { title: "Réseau" },
        challenger: actor(HIGH, "Inconnu"),
        opponent: actor(LOW, "Alex"),
      },
    ]);
    const rows = await friendshipRepository.recentFriendActivity(ME, 6);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "duel", title: "Réseau", friend: { id: LOW } });
    expect(JSON.stringify(rows)).not.toContain("Inconnu");

    const [duelQuery] = mockPrisma.duel.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(duelQuery.where).toMatchObject({ status: "FINISHED", winnerId: { in: [LOW] } });
  });
});
