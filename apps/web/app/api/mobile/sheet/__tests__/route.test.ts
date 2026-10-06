import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RevisionSheet } from "@cyberlearn/lib/paths/sheet";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  loadSheet: vi.fn<(slug: string, viewerId: string, n: number) => Promise<RevisionSheet | null>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/sheets/load", () => ({ loadSheet: m.loadSheet }));

const { GET } = await import("../route");

const request = (search: string): NextRequest =>
  new NextRequest(`https://cyberlearn.fr/api/mobile/sheet${search}`);

const SHEET: RevisionSheet = {
  pathTitle: "Linux",
  moduleNumber: 3,
  moduleTitle: "Chercher",
  title: "Module 03 · Chercher",
  sections: [{ lessonTitle: "grep", points: ["grep cherche."] }],
  pointCount: 1,
};

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/sheet", () => {
  it("refuses a caller the gate turns away, and builds nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    const res = await GET(request("?path=linux&module=3"));
    expect(res.status).toBe(401);
    expect(m.loadSheet).not.toHaveBeenCalled();
  });

  it("wants a path and a module number", async () => {
    expect((await GET(request("?path=linux"))).status).toBe(400);
    expect((await GET(request("?path=linux&module=0"))).status).toBe(400);
    expect((await GET(request("?path=&module=1"))).status).toBe(400);
    expect(m.loadSheet).not.toHaveBeenCalled();
  });

  it("gives the sheet the site builds, for this reader", async () => {
    m.loadSheet.mockResolvedValue(SHEET);
    const res = await GET(request("?path=linux&module=3"));
    expect(await res.json()).toEqual({ ok: true, sheet: SHEET });
    expect(m.loadSheet).toHaveBeenCalledWith("linux", "user-1", 3);
  });

  it("says not found for a path or a module the reader has not", async () => {
    m.loadSheet.mockResolvedValue(null);
    const res = await GET(request("?path=secret&module=9"));
    expect(res.status).toBe(404);
  });
});
