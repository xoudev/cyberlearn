import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  getOverview: vi.fn<(u: string) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({ streakRepository: { getOverview: m.getOverview } }));

const { GET } = await import("../route");

const URL = "https://cyberlearn.fr/api/mobile/streak";

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/streak", () => {
  it("refuses a caller the gate turns away, and reads nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(new NextRequest(URL))).status).toBe(401);
    expect(m.getOverview).not.toHaveBeenCalled();
  });

  it("returns the caller's own overview, freezes included", async () => {
    const overview = {
      currentStreak: 4,
      longestStreak: 12,
      freezes: 2,
      active: true,
      daysThisYear: 80,
      activity: { "2026-09-22": 2 },
    };
    m.getOverview.mockResolvedValue(overview);
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ...overview });
    expect(m.getOverview).toHaveBeenCalledWith("user-1");
  });

  it("answers 404 when the account has no row", async () => {
    m.getOverview.mockResolvedValue(null);
    expect((await GET(new NextRequest(URL))).status).toBe(404);
  });
});
