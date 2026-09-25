import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  recapFor: vi.fn<(userId: string) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/wrapped/recap", () => ({ recapFor: m.recapFor }));

const { GET } = await import("../route");

const request = (): NextRequest => new NextRequest("https://cyberlearn.fr/api/mobile/wrapped");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/wrapped", () => {
  it("refuses a caller the gate turns away", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(m.recapFor).not.toHaveBeenCalled();
  });

  it("sends the caller's own recap, or when it opens", async () => {
    m.recapFor.mockResolvedValue({ open: false, periodKey: "2026", opensOn: "2026-12-01" });
    const res = await GET(request());
    expect(m.recapFor).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual({
      ok: true,
      open: false,
      periodKey: "2026",
      opensOn: "2026-12-01",
    });
  });
});
