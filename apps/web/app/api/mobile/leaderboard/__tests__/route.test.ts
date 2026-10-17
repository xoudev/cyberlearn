import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardEntry } from "@cyberlearn/db";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findTopUsers: vi.fn<(n: number, u: string) => Promise<unknown[]>>(),
  findTopUsersSince: vi.fn<(start: Date, n: number, u: string) => Promise<unknown>>(),
  countRanked: vi.fn<() => Promise<number>>(),
  findCurrentUserPosition: vi.fn<(u: string) => Promise<{ rank: number | null } | null>>(),
  findFriendsBoard: vi.fn<(u: string, since: Date | null) => Promise<unknown>>(),
  getActiveSeason: vi.fn<() => Promise<unknown>>(),
  getUserMembership: vi.fn<(u: string, s: string) => Promise<unknown>>(),
  getPodLadder: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
  resolveAvatarSrcMany: vi.fn<(values: (string | null)[]) => Promise<(string | null)[]>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({
  leaderboardRepository: {
    findTopUsers: m.findTopUsers,
    findTopUsersSince: m.findTopUsersSince,
    countRanked: m.countRanked,
    findCurrentUserPosition: m.findCurrentUserPosition,
    findFriendsBoard: m.findFriendsBoard,
  },
  leagueRepository: {
    getActiveSeason: m.getActiveSeason,
    getUserMembership: m.getUserMembership,
    getPodLadder: m.getPodLadder,
  },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));

const { GET } = await import("../route");

const request = (query = ""): NextRequest =>
  new NextRequest(`https://cyberlearn.fr/api/mobile/leaderboard${query}`);

// Wednesday 14 October 2026, 12:00 Paris: the week opened on Monday the 12th.
const NOW = new Date("2026-10-14T10:00:00Z");
const MONDAY = new Date("2026-10-11T22:00:00Z");
const FIRST_OF_OCTOBER = new Date("2026-09-30T22:00:00Z");

const board = {
  entries: [{ rank: 1, isCurrentUser: true, avatarUrl: null }],
  listedForFriends: false,
};

/** Signing as storage.ts does it: an uploaded key becomes a URL, anything else stays. */
function signLikeStorage(values: (string | null)[]): Promise<(string | null)[]> {
  return Promise.resolve(
    values.map((v) =>
      v?.startsWith("__upload:") ? `https://signed.example/${v.slice("__upload:".length)}` : v,
    ),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
  m.findTopUsers.mockResolvedValue([]);
  m.findCurrentUserPosition.mockResolvedValue({ rank: 7 });
  m.countRanked.mockResolvedValue(1234);
  m.findFriendsBoard.mockResolvedValue(board);
  m.getActiveSeason.mockResolvedValue(null);
  m.resolveAvatarSrcMany.mockImplementation(signLikeStorage);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/mobile/leaderboard", () => {
  it("refuses a caller the gate turns away: no token, or banned", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(m.findFriendsBoard).not.toHaveBeenCalled();
  });

  it("answers an app without periods as it always has, plus the real count", async () => {
    const res = await GET(request());
    expect(m.findTopUsers).toHaveBeenCalledWith(50, "user-1");
    expect(m.findTopUsersSince).not.toHaveBeenCalled();
    expect(m.findFriendsBoard).toHaveBeenCalledWith("user-1", null);
    expect(await res.json()).toEqual({
      ok: true,
      entries: [],
      userRank: 7,
      league: null,
      friendsBoard: { ...board, entries: [{ ...board.entries[0], avatarSrc: null }] },
      period: "all",
      periodSince: null,
      totalPlayers: 1234,
    });
  });

  it("leaves a hidden reader out of the count they are told, never '341e sur 340'", async () => {
    // findCurrentUserPosition's null rank: hidden, or not ranked at all. The
    // count leaves them out, so their place on it has to as well.
    m.findCurrentUserPosition.mockResolvedValue({ rank: null });
    m.countRanked.mockResolvedValue(340);
    const body = (await (await GET(request())).json()) as Record<string, unknown>;
    expect(m.findCurrentUserPosition).toHaveBeenCalledWith("user-1");
    expect(body).toMatchObject({ userRank: 0, totalPlayers: 340 });
  });

  it("reads 0 for a reader the repository does not find", async () => {
    m.findCurrentUserPosition.mockResolvedValue(null);
    const body = (await (await GET(request())).json()) as Record<string, unknown>;
    expect(body).toMatchObject({ userRank: 0 });
  });

  it("serves the week from Monday, Paris time, in the same fields", async () => {
    const entries = [{ rank: 1, xpTotal: 80, isCurrentUser: false }];
    m.findTopUsersSince.mockResolvedValue({
      entries,
      total: 12,
      standing: { rank: 4, xp: 30 },
    });

    const body = (await (await GET(request("?period=week"))).json()) as Record<string, unknown>;

    expect(m.findTopUsersSince).toHaveBeenCalledWith(MONDAY, 50, "user-1");
    expect(m.findFriendsBoard).toHaveBeenCalledWith("user-1", MONDAY);
    expect(m.findTopUsers).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: true,
      entries,
      userRank: 4,
      friendsBoard: board,
      period: "week",
      periodSince: "depuis lundi 12 octobre",
      totalPlayers: 12,
    });
  });

  it("serves the month from the 1st, and 0 for a reader it does not rank", async () => {
    m.findTopUsersSince.mockResolvedValue({ entries: [], total: 0, standing: null });
    const body = (await (await GET(request("?period=month"))).json()) as Record<string, unknown>;
    expect(m.findTopUsersSince).toHaveBeenCalledWith(FIRST_OF_OCTOBER, 50, "user-1");
    expect(body).toMatchObject({ userRank: 0, period: "month", totalPlayers: 0 });
  });

  it("reads an unknown period as all time rather than failing", async () => {
    const body = (await (await GET(request("?period=year"))).json()) as Record<string, unknown>;
    expect(m.findTopUsersSince).not.toHaveBeenCalled();
    expect(body).toMatchObject({ ok: true, period: "all" });
  });
});

/**
 * The rows' pictures. The stored avatarUrl of an uploaded photo is a key in a
 * private bucket the app may not open, so the route signs it, as the site's
 * board does, in a field added beside it.
 */
describe("GET /api/mobile/leaderboard: avatars", () => {
  function row(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
    return {
      rank: 1,
      isCurrentUser: false,
      displayName: "Alex",
      username: "alex",
      avatarUrl: "__upload:u2/photo.png",
      level: 10,
      xpTotal: 900,
      streakDays: 2,
      hasPublicProfile: true,
      isFriend: false,
      ...overrides,
    };
  }

  // What the repository sends for an ANONYMOUS player: no identity, no avatar.
  const anonymous = row({
    rank: 2,
    displayName: null,
    username: null,
    avatarUrl: null,
    hasPublicProfile: false,
  });

  interface AppRow extends LeaderboardEntry {
    avatarSrc: string | null;
  }

  interface Body {
    entries: AppRow[];
    friendsBoard: { entries: AppRow[]; listedForFriends: boolean };
  }

  async function body(query = ""): Promise<Body> {
    // The route's own JSON, read back in the shape it was built in.
    return (await (await GET(request(query))).json()) as Body;
  }

  it("signs a public row's photo and keeps the stored value beside it", async () => {
    m.findTopUsers.mockResolvedValue([row()]);
    const [entry] = (await body()).entries;
    expect(entry?.avatarSrc).toBe("https://signed.example/u2/photo.png");
    expect(entry?.avatarUrl).toBe("__upload:u2/photo.png");
  });

  it("gives an anonymous row no picture, and signs nothing for it", async () => {
    m.findTopUsers.mockResolvedValue([anonymous]);
    m.findFriendsBoard.mockResolvedValue({ entries: [], listedForFriends: false });
    const [entry] = (await body()).entries;
    expect(entry?.avatarSrc).toBeNull();
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledWith([null]);
  });

  it("signs the reader's own row, which shows them who they are", async () => {
    // The repository reveals the reader's own identity on an anonymous board row.
    m.findTopUsers.mockResolvedValue([
      row({
        rank: 3,
        isCurrentUser: true,
        avatarUrl: "__upload:me/me.webp",
        hasPublicProfile: false,
      }),
    ]);
    const [entry] = (await body()).entries;
    expect(entry?.avatarSrc).toBe("https://signed.example/me/me.webp");
  });

  it("passes a built-in picture and a glyph through as they are", async () => {
    m.findTopUsers.mockResolvedValue([
      row({ avatarUrl: "/avatars/av-3.svg" }),
      row({ rank: 2, avatarUrl: "__glyph:skull" }),
    ]);
    const { entries } = await body();
    expect(entries.map((e) => e.avatarSrc)).toEqual(["/avatars/av-3.svg", "__glyph:skull"]);
  });

  it("never hands out the stored key of a photo it could not sign", async () => {
    m.findTopUsers.mockResolvedValue([row()]);
    m.resolveAvatarSrcMany.mockResolvedValue([null]);
    const [entry] = (await body()).entries;
    expect(entry?.avatarSrc).toBeNull();
  });

  it("signs the friends board too, in the same round-trip and in order", async () => {
    m.findTopUsers.mockResolvedValue([row(), anonymous]);
    m.findFriendsBoard.mockResolvedValue({
      entries: [row({ username: "sam", avatarUrl: "__upload:f1/sam.jpg", isFriend: true })],
      listedForFriends: true,
    });

    const { entries, friendsBoard } = await body();

    expect(m.resolveAvatarSrcMany).toHaveBeenCalledOnce();
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledWith([
      "__upload:u2/photo.png",
      null,
      "__upload:f1/sam.jpg",
    ]);
    expect(entries.map((e) => e.avatarSrc)).toEqual(["https://signed.example/u2/photo.png", null]);
    expect(friendsBoard.listedForFriends).toBe(true);
    expect(friendsBoard.entries[0]?.avatarSrc).toBe("https://signed.example/f1/sam.jpg");
  });

  it("signs a period's rows the same way", async () => {
    m.findTopUsersSince.mockResolvedValue({
      entries: [row({ xpTotal: 80 }), anonymous],
      total: 2,
      standing: null,
    });
    const { entries } = await body("?period=week");
    expect(entries.map((e) => e.avatarSrc)).toEqual(["https://signed.example/u2/photo.png", null]);
  });
});
