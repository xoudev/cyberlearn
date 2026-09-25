import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  placementTestFor: vi.fn<(u: string) => Promise<unknown>>(),
  submitPlacementFor: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
  markOnboardingComplete: vi.fn<(u: string) => Promise<void>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/onboarding/placement", () => ({
  placementTestFor: m.placementTestFor,
  submitPlacementFor: m.submitPlacementFor,
}));
vi.mock("@/lib/onboarding/finalize", () => ({
  markOnboardingComplete: m.markOnboardingComplete,
}));

const { GET } = await import("../route");
const { POST } = await import("../submit/route");

const URL = "https://cyberlearn.fr/api/mobile/placement";

function submit(body: string): NextRequest {
  return new NextRequest(`${URL}/submit`, { method: "POST", body });
}

const ANSWERS = {
  answers: [{ questionId: "4c8a4f5e-8a1b-4b51-9c1e-2f0f1c1d2e3f", selectedOptionId: "a" }],
};

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/placement", () => {
  it("refuses a caller the gate turns away", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(new NextRequest(URL))).status).toBe(401);
    expect(m.placementTestFor).not.toHaveBeenCalled();
  });

  it("returns the caller's test as the service states it", async () => {
    m.placementTestFor.mockResolvedValue({ status: "taken" });
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "taken" });
    expect(m.placementTestFor).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/mobile/placement/submit", () => {
  it("refuses a caller the gate turns away, and writes nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(submit(JSON.stringify(ANSWERS)))).status).toBe(401);
    expect(m.submitPlacementFor).not.toHaveBeenCalled();
    expect(m.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    expect((await POST(submit("nope"))).status).toBe(400);
    expect(m.submitPlacementFor).not.toHaveBeenCalled();
  });

  it("scores as the caller, then marks the sign-up complete", async () => {
    const scores = { devScore: 80, cybersecScore: 20, networkScore: 50 };
    m.submitPlacementFor.mockResolvedValue({ ok: true, scores, recommendedPathSlug: "python" });
    const res = await POST(submit(JSON.stringify(ANSWERS)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, scores, recommendedPathSlug: "python" });
    expect(m.submitPlacementFor).toHaveBeenCalledWith("user-1", ANSWERS);
    expect(m.markOnboardingComplete).toHaveBeenCalledWith("user-1");
  });

  it("says so when the test was already taken, without touching the sign-up", async () => {
    m.submitPlacementFor.mockResolvedValue({ ok: false, reason: "taken" });
    const res = await POST(submit(JSON.stringify(ANSWERS)));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, taken: true });
    expect(m.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("passes the service's refusal on for an invalid submission", async () => {
    m.submitPlacementFor.mockResolvedValue({ ok: false, reason: "invalid", error: "Invalide." });
    const res = await POST(submit(JSON.stringify({ answers: [] })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalide." });
    expect(m.markOnboardingComplete).not.toHaveBeenCalled();
  });
});
