import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  searchFor: vi.fn<(u: string, term: string | null) => Promise<unknown[]>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/search/run", () => ({ searchFor: m.searchFor }));

const { GET } = await import("../route");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
  m.searchFor.mockResolvedValue([]);
});

describe("GET /api/mobile/search", () => {
  it("refuses a caller the gate turns away, and searches nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    const res = await GET(new NextRequest("https://cyberlearn.fr/api/mobile/search?q=sql"));
    expect(res.status).toBe(401);
    expect(m.searchFor).not.toHaveBeenCalled();
  });

  it("searches as the caller with the term given", async () => {
    const groups = [{ kind: "path", label: "Parcours", results: [] }];
    m.searchFor.mockResolvedValue(groups);
    const res = await GET(new NextRequest("https://cyberlearn.fr/api/mobile/search?q=sql"));
    expect(await res.json()).toEqual({ ok: true, groups });
    expect(m.searchFor).toHaveBeenCalledWith("user-1", "sql");
  });

  it("passes no term on as none", async () => {
    await GET(new NextRequest("https://cyberlearn.fr/api/mobile/search"));
    expect(m.searchFor).toHaveBeenCalledWith("user-1", null);
  });
});
