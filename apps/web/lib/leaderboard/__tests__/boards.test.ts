import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardEntry } from "@cyberlearn/db";

const m = vi.hoisted(() => ({
  findTopUsers: vi.fn<(limit: number, userId: string) => Promise<LeaderboardEntry[]>>(),
  countRanked: vi.fn<() => Promise<number>>(),
  findCurrentUserPosition: vi.fn<(userId: string) => Promise<unknown>>(),
  findTopUsersSince:
    vi.fn<(start: Date, limit: number, userId: string) => Promise<Record<string, unknown>>>(),
  resolveAvatarSrcMany: vi.fn<(values: (string | null)[]) => Promise<(string | null)[]>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  leaderboardRepository: {
    findTopUsers: m.findTopUsers,
    countRanked: m.countRanked,
    findCurrentUserPosition: m.findCurrentUserPosition,
    findTopUsersSince: m.findTopUsersSince,
  },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));

const { BOARD_ROWS, boardRows, publicBoardFor } = await import("../boards");

/**
 * What the leaderboard page is handed: each row's link and picture decided on
 * the server from what the repository already revealed, and the board's real
 * count and the reader's place rather than the length of a cut list.
 */

const ME = "11111111-1111-4111-8111-111111111111";
const WEEK = new Date("2026-10-11T22:00:00Z");

function entry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    rank: 1,
    isCurrentUser: false,
    displayName: "Alex",
    username: "alex",
    avatarUrl: "avatars/u1/photo.png",
    level: 10,
    xpTotal: 900,
    streakDays: 2,
    hasPublicProfile: true,
    isFriend: false,
    ...overrides,
  };
}

const ANONYMOUS = entry({
  rank: 2,
  displayName: null,
  username: null,
  avatarUrl: null,
  hasPublicProfile: false,
});

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  // Signing turns a stored key into a URL and leaves anything else as it is.
  m.resolveAvatarSrcMany.mockImplementation((values) =>
    Promise.resolve(values.map((v) => (v === null ? null : `https://signed.example/${v}`))),
  );
  m.findCurrentUserPosition.mockResolvedValue({
    visibility: "ANONYMOUS",
    rank: 240,
    level: 14,
    xpTotal: 3100,
    streakDays: 0,
    displayName: "Moi",
    username: "moi",
    avatarUrl: null,
  });
});

describe("boardRows", () => {
  it("links a public profile and signs its picture", async () => {
    const [row] = await boardRows([entry()]);
    expect(row?.profileHref).toBe("/u/alex");
    expect(row?.avatarSrc).toBe("https://signed.example/avatars/u1/photo.png");
  });

  it("gives an anonymous row neither a link nor a picture", async () => {
    const [row] = await boardRows([ANONYMOUS]);
    expect(row?.profileHref).toBeNull();
    expect(row?.avatarSrc).toBeNull();
  });

  it("names a public player with a private profile page without a link", async () => {
    const [row] = await boardRows([entry({ hasPublicProfile: false })]);
    expect(row?.profileHref).toBeNull();
    expect(row?.avatarSrc).not.toBeNull();
  });

  it("signs the whole board in one round-trip, in order", async () => {
    await boardRows([entry(), ANONYMOUS, entry({ rank: 3, avatarUrl: "/avatars/av-1.svg" })]);
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledOnce();
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledWith([
      "avatars/u1/photo.png",
      null,
      "/avatars/av-1.svg",
    ]);
  });
});

describe("publicBoardFor", () => {
  it("counts every ranked player on the all-time board, not the rows sent", async () => {
    m.findTopUsers.mockResolvedValue([entry()]);
    m.countRanked.mockResolvedValue(5000);

    const board = await publicBoardFor(ME, null);

    expect(m.findTopUsers).toHaveBeenCalledWith(BOARD_ROWS, ME);
    expect(m.findTopUsersSince).not.toHaveBeenCalled();
    expect(board.total).toBe(5000);
    // Ranked far below the hundred rows on the page, and still told where.
    expect(board.standing).toEqual({ rank: 240, xp: 3100, level: 14 });
  });

  it("does not rank a hidden reader on the all-time board", async () => {
    m.findTopUsers.mockResolvedValue([]);
    m.countRanked.mockResolvedValue(10);
    m.findCurrentUserPosition.mockResolvedValue({ visibility: "HIDDEN", rank: null, level: 3 });
    expect((await publicBoardFor(ME, null)).standing).toBeNull();
  });

  it("reads a period from the ledger, with its own count and place", async () => {
    m.findTopUsersSince.mockResolvedValue({
      entries: [entry({ xpTotal: 150 })],
      total: 37,
      standing: { rank: 9, xp: 60 },
    });

    const board = await publicBoardFor(ME, WEEK);

    expect(m.findTopUsersSince).toHaveBeenCalledWith(WEEK, BOARD_ROWS, ME);
    expect(m.findTopUsers).not.toHaveBeenCalled();
    expect(m.countRanked).not.toHaveBeenCalled();
    expect(board.total).toBe(37);
    expect(board.rows[0]?.xpTotal).toBe(150);
    expect(board.standing).toEqual({ rank: 9, xp: 60, level: 14 });
  });

  it("leaves a reader with no XP in the period off it", async () => {
    m.findTopUsersSince.mockResolvedValue({ entries: [], total: 0, standing: null });
    expect((await publicBoardFor(ME, WEEK)).standing).toBeNull();
  });
});
