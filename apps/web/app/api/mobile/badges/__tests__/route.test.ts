import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  buildBadgeCollection: vi.fn<(u: string) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/badges/collection", () => ({ buildBadgeCollection: m.buildBadgeCollection }));

const { GET } = await import("../route");

const COLLECTION = {
  groups: [{ rarity: "COMMON", label: "Commun", badges: [] }],
  earnedCount: 1,
  totalCount: 4,
  rarityTotals: { COMMON: 4 },
  rarityEarned: { COMMON: 1 },
};

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
  m.buildBadgeCollection.mockResolvedValue(COLLECTION);
});

describe("GET /api/mobile/badges", () => {
  it("refuses a caller the gate turns away, and builds nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    const res = await GET(new NextRequest("https://cyberlearn.fr/api/mobile/badges"));
    expect(res.status).toBe(401);
    expect(m.buildBadgeCollection).not.toHaveBeenCalled();
  });

  it("builds the collection of the caller, never of an id the request names", async () => {
    const res = await GET(new NextRequest("https://cyberlearn.fr/api/mobile/badges?userId=user-2"));
    expect(await res.json()).toEqual({ ok: true, ...COLLECTION });
    expect(m.buildBadgeCollection).toHaveBeenCalledWith("user-1");
  });
});
