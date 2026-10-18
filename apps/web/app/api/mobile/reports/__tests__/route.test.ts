import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  reportContentFor: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/moderation/content-report", () => ({ reportContentFor: m.reportContentFor }));

const { POST } = await import("../route");

function post(body: string): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/reports", { method: "POST", body });
}

beforeEach(() => {
  m.userFromBearer.mockReset();
  m.reportContentFor.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("POST /api/mobile/reports", () => {
  it("refuses a caller the gate turns away: no token, or banned", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(post("{}"))).status).toBe(401);
    expect(m.reportContentFor).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    expect((await POST(post("not json"))).status).toBe(400);
    expect(m.reportContentFor).not.toHaveBeenCalled();
  });

  it("reports as the caller, with the body as it came", async () => {
    m.reportContentFor.mockResolvedValue({ ok: true });
    const body = {
      surface: "FORUM_POST",
      contentId: "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d",
      reason: "SPAM",
      comment: "Publicité.",
    };
    const res = await POST(post(JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(m.reportContentFor).toHaveBeenCalledWith("user-1", body);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("passes a refusal on, with its words", async () => {
    m.reportContentFor.mockResolvedValue({ ok: false, error: "Ce contenu n'est plus disponible." });
    const res = await POST(post("{}"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Ce contenu n'est plus disponible." });
  });
});
