import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findTopUsers: vi.fn<(n: number, u: string) => Promise<unknown[]>>(),
  findUserRank: vi.fn<(u: string) => Promise<number>>(),
  findFriendsBoard: vi.fn<(u: string) => Promise<unknown>>(),
  getActiveSeason: vi.fn<() => Promise<unknown>>(),
  getUserMembership: vi.fn<(u: string, s: string) => Promise<unknown>>(),
  getPodLadder: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({
  leaderboardRepository: {
    findTopUsers: m.findTopUsers,
    findUserRank: m.findUserRank,
    findFriendsBoard: m.findFriendsBoard,
  },
  leagueRepository: {
    getActiveSeason: m.getActiveSeason,
    getUserMembership: m.getUserMembership,
    getPodLadder: m.getPodLadder,
  },
}));

const { GET } = await import("../route");

const request = (): NextRequest => new NextRequest("https://cyberlearn.fr/api/mobile/leaderboard");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
  m.findTopUsers.mockResolvedValue([]);
  m.findUserRank.mockResolvedValue(7);
  m.getActiveSeason.mockResolvedValue(null);
});

describe("GET /api/mobile/leaderboard", () => {
  it("refuses a caller the gate turns away: no token, or banned", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(m.findFriendsBoard).not.toHaveBeenCalled();
  });

  it("sends the caller's own friends board with the public one", async () => {
    const board = { entries: [{ rank: 1, isCurrentUser: true }], listedForFriends: false };
    m.findFriendsBoard.mockResolvedValue(board);
    const res = await GET(request());
    expect(m.findFriendsBoard).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual({
      ok: true,
      entries: [],
      userRank: 7,
      league: null,
      friendsBoard: board,
    });
  });
});
