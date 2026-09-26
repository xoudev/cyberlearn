import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findUserRank: vi.fn<(u: string) => Promise<number>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({ leaderboardRepository: { findUserRank: m.findUserRank } }));

const { GET } = await import("../route");

const request = (): NextRequest => new NextRequest("https://cyberlearn.fr/api/mobile/rank");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/rank", () => {
  it("refuses a caller the gate turns away, and counts nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(m.findUserRank).not.toHaveBeenCalled();
  });

  it("gives the caller's own rank", async () => {
    m.findUserRank.mockResolvedValue(7);
    expect(await (await GET(request())).json()).toEqual({ ok: true, rank: 7 });
    expect(m.findUserRank).toHaveBeenCalledWith("user-1");
  });

  it("says not ranked rather than 0", async () => {
    m.findUserRank.mockResolvedValue(0);
    expect(await (await GET(request())).json()).toEqual({ ok: true, rank: null });
  });
});
