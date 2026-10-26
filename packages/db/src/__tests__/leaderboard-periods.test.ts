/**
 * The leaderboard's period boards and its real count: the week and the month
 * read from the XP ledger, under the same rules as the all-time board (who is
 * ranked, who is named, who carries the friend mark). Prisma is mocked; the
 * windows themselves (Monday and the 1st, Paris time) are
 * @cyberlearn/lib's leaderboardPeriodStart, tested there.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardRepository } from "../repositories/leaderboard.repository.js";

const { mockPrisma, mockFriends } = vi.hoisted(() => ({
  mockPrisma: {
    xpLedger: { groupBy: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
  },
  mockFriends: { viewsOf: vi.fn(), listFriends: vi.fn() },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));
vi.mock("../repositories/friendship.repository.js", () => ({
  friendshipRepository: mockFriends,
}));

const ME = "11111111-1111-4111-8111-111111111111";
const PUB = "22222222-2222-4222-8222-222222222222";
const ANON = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";

// Monday 12 October 2026, 00:00 Paris.
const WEEK = new Date("2026-10-11T22:00:00Z");

type Visibility = "PUBLIC" | "ANONYMOUS" | "HIDDEN";

function person(id: string, visibility: Visibility, xpTotal = 99_999) {
  return {
    id,
    displayName: `Nom ${id.slice(0, 4)}`,
    username: `user${id.slice(0, 4)}`,
    avatarUrl: `/avatars/${id.slice(0, 4)}.svg`,
    level: 12,
    xpTotal,
    streakDays: 4,
    preferences: { leaderboardVisibility: visibility, publicProfile: true },
  };
}

function sum(userId: string, amount: number) {
  return { userId, _sum: { amount } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFriends.viewsOf.mockResolvedValue(new Map<string, string>());
  mockFriends.listFriends.mockResolvedValue([]);
});

describe("findTopUsersSince", () => {
  it("sums the ledger from the period's start, for ranked players only", async () => {
    mockPrisma.xpLedger.groupBy.mockResolvedValue([]);
    await leaderboardRepository.findTopUsersSince(WEEK, 100, ME);

    const [query] = mockPrisma.xpLedger.groupBy.mock.calls[0] as [Record<string, unknown>];
    expect(query).toMatchObject({
      by: ["userId"],
      where: {
        createdAt: { gte: WEEK },
        // The all-time board's filter, read through the ledger's user: students,
        // with XP, and not HIDDEN.
        user: {
          is: {
            role: "STUDENT",
            xpTotal: { gt: 0 },
            OR: [
              { preferences: { is: null } },
              { preferences: { is: { leaderboardVisibility: { not: "HIDDEN" } } } },
            ],
          },
        },
      },
      // Corrections are negative lines: a period whose XP was all taken back
      // adds up to 0 or less, and leaves the player off the board.
      having: { amount: { _sum: { gt: 0 } } },
      orderBy: [{ _sum: { amount: "desc" } }, { userId: "asc" }],
    });
  });

  it("ranks by the period's XP and shows it in place of the total", async () => {
    mockPrisma.xpLedger.groupBy.mockResolvedValue([sum(PUB, 300), sum(ME, 120)]);
    mockPrisma.user.findMany.mockResolvedValue([
      person(ME, "ANONYMOUS", 50_000),
      person(PUB, "PUBLIC", 10),
    ]);

    const board = await leaderboardRepository.findTopUsersSince(WEEK, 100, ME);

    // The ledger's order, not the order the people came back in.
    expect(board.entries.map((e) => [e.rank, e.xpTotal, e.isCurrentUser])).toEqual([
      [1, 300, false],
      [2, 120, true],
    ]);
    expect(board.total).toBe(2);
    expect(board.standing).toEqual({ rank: 2, xp: 120 });
  });

  it("counts every ranked player, not only the rows it sends", async () => {
    mockPrisma.xpLedger.groupBy.mockResolvedValue([
      sum(PUB, 500),
      sum(ANON, 400),
      sum(OTHER, 300),
      sum(ME, 200),
    ]);
    mockPrisma.user.findMany.mockResolvedValue([person(PUB, "PUBLIC"), person(ANON, "ANONYMOUS")]);

    const board = await leaderboardRepository.findTopUsersSince(WEEK, 2, ME);

    // Only the first two people are read.
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [PUB, ANON] } } }),
    );
    expect(board.entries).toHaveLength(2);
    expect(board.total).toBe(4);
    // The reader is fourth, below the cut, and still told so.
    expect(board.standing).toEqual({ rank: 4, xp: 200 });
  });

  it("shares a rank between equal scores, as the all-time standing does", async () => {
    mockPrisma.xpLedger.groupBy.mockResolvedValue([sum(PUB, 300), sum(OTHER, 200), sum(ME, 200)]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    const board = await leaderboardRepository.findTopUsersSince(WEEK, 100, ME);
    expect(board.standing).toEqual({ rank: 2, xp: 200 });
  });

  it("strips an anonymous player and marks only a public friend", async () => {
    mockFriends.viewsOf.mockResolvedValue(
      new Map([
        [PUB, "friends"],
        [ANON, "friends"],
      ]),
    );
    mockPrisma.xpLedger.groupBy.mockResolvedValue([sum(PUB, 300), sum(ANON, 200)]);
    mockPrisma.user.findMany.mockResolvedValue([person(PUB, "PUBLIC"), person(ANON, "ANONYMOUS")]);

    const board = await leaderboardRepository.findTopUsersSince(WEEK, 100, ME);
    const [pub, anon] = board.entries;

    // The relations are read for the rows sent, and for nobody else.
    expect(mockFriends.viewsOf).toHaveBeenCalledWith(ME, [PUB, ANON]);
    expect(pub?.username).toBe(`user${PUB.slice(0, 4)}`);
    expect(pub?.isFriend).toBe(true);
    expect(anon?.displayName).toBeNull();
    expect(anon?.username).toBeNull();
    expect(anon?.avatarUrl).toBeNull();
    expect(anon?.isFriend).toBe(false);
    for (const entry of board.entries) expect(Object.keys(entry)).not.toContain("id");
  });

  it("drops a player who turned HIDDEN between the two reads, without a gap", async () => {
    mockPrisma.xpLedger.groupBy.mockResolvedValue([sum(OTHER, 400), sum(PUB, 300)]);
    mockPrisma.user.findMany.mockResolvedValue([person(OTHER, "HIDDEN"), person(PUB, "PUBLIC")]);
    const board = await leaderboardRepository.findTopUsersSince(WEEK, 100, ME);
    expect(board.entries.map((e) => [e.rank, e.xpTotal])).toEqual([[1, 300]]);
  });

  it("does not rank a reader with no XP in the period, and reads nobody for an empty one", async () => {
    mockPrisma.xpLedger.groupBy.mockResolvedValue([]);
    const board = await leaderboardRepository.findTopUsersSince(WEEK, 100, ME);
    expect(board).toEqual({ entries: [], total: 0, standing: null });
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe("countRanked", () => {
  it("counts with the board's own filter", async () => {
    mockPrisma.user.count.mockResolvedValue(1234);
    expect(await leaderboardRepository.countRanked()).toBe(1234);
    expect(mockPrisma.user.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ role: "STUDENT", xpTotal: { gt: 0 } }),
    });
  });
});

describe("findFriendsBoard over a period", () => {
  function friendRow(id: string, xpTotal: number, optedIn = true) {
    return {
      id,
      displayName: `Nom ${id.slice(0, 4)}`,
      username: `user${id.slice(0, 4)}`,
      avatarUrl: null,
      level: 3,
      xpTotal,
      streakDays: 0,
      role: "STUDENT",
      preferences: { friendsLeaderboard: optedIn },
    };
  }

  beforeEach(() => {
    mockFriends.listFriends.mockResolvedValue([{ person: { id: PUB } }, { person: { id: ANON } }]);
    // In all-time order: the period board must not keep it.
    mockPrisma.user.findMany.mockResolvedValue([
      friendRow(PUB, 9000),
      friendRow(ANON, 5000),
      friendRow(ME, 100, false),
    ]);
  });

  it("ranks the same people by what they earned since the start", async () => {
    mockPrisma.xpLedger.groupBy.mockResolvedValue([sum(ME, 80), sum(ANON, 40)]);

    const board = await leaderboardRepository.findFriendsBoard(ME, WEEK);

    expect(mockPrisma.xpLedger.groupBy).toHaveBeenCalledWith({
      by: ["userId"],
      where: { userId: { in: [PUB, ANON, ME] }, createdAt: { gte: WEEK } },
      _sum: { amount: true },
    });
    // A friend with nothing this week stays on the board, at 0.
    expect(board.entries.map((e) => [e.rank, e.xpTotal, e.isCurrentUser])).toEqual([
      [1, 80, true],
      [2, 40, false],
      [3, 0, false],
    ]);
    expect(board.entries.map((e) => e.isFriend)).toEqual([false, true, true]);
    expect(board.listedForFriends).toBe(false);
  });

  it("counts XP taken back in the period, down to 0 and never below", async () => {
    // ANON earned 40 this week, then a correction took 100 back: -60 in all.
    mockPrisma.xpLedger.groupBy.mockResolvedValue([sum(ME, 80), sum(ANON, -60), sum(PUB, 30)]);

    const board = await leaderboardRepository.findFriendsBoard(ME, WEEK);

    expect(board.entries.map((e) => [e.rank, e.xpTotal, e.isCurrentUser])).toEqual([
      [1, 80, true],
      [2, 30, false],
      [3, 0, false],
    ]);
  });

  it("keeps the all-time board without reading the ledger", async () => {
    const board = await leaderboardRepository.findFriendsBoard(ME);
    expect(mockPrisma.xpLedger.groupBy).not.toHaveBeenCalled();
    expect(board.entries.map((e) => e.xpTotal)).toEqual([9000, 5000, 100]);
  });
});

describe("findPublicPlayerId", () => {
  it("finds a handle only among the players the public board names", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: PUB });
    expect(await leaderboardRepository.findPublicPlayerId("alex")).toBe(PUB);

    const [query] = mockPrisma.user.findFirst.mock.calls[0] as [{ where: { AND: unknown[] } }];
    expect(query.where.AND).toEqual(
      expect.arrayContaining([
        { username: "alex" },
        { preferences: { is: { leaderboardVisibility: "PUBLIC" } } },
        expect.objectContaining({ role: "STUDENT", xpTotal: { gt: 0 } }),
      ]),
    );
  });

  it("finds nobody behind a handle the board does not show", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    expect(await leaderboardRepository.findPublicPlayerId("anonyme")).toBeNull();
  });
});
