import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  mockExamOverview: vi.fn<(userId: string, slug: unknown) => Promise<unknown>>(),
  startMockExam: vi.fn<(userId: string, pathId: unknown) => Promise<{ ok: boolean }>>(),
  submitMockExam:
    vi.fn<(userId: string, attemptId: unknown, answers: unknown) => Promise<{ ok: boolean }>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("../../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/exam/mock-exam", () => ({
  mockExamOverview: m.mockExamOverview,
  startMockExam: m.startMockExam,
  submitMockExam: m.submitMockExam,
}));

const { GET, POST } = await import("../route");
const submitRoute = await import("../submit/route");

const BASE = "https://cyberlearn.fr/api/mobile/mock-exam";
const post = (url: string, body: unknown): NextRequest =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "u1", email: null });
});

describe("/api/mobile/mock-exam", () => {
  it("refuses a caller the gate turns away, everywhere", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(new NextRequest(`${BASE}?slug=linux`))).status).toBe(401);
    expect((await POST(post(BASE, { pathId: "p" }))).status).toBe(401);
    expect((await submitRoute.POST(post(`${BASE}/submit`, {}))).status).toBe(401);
    expect(m.mockExamOverview).not.toHaveBeenCalled();
    expect(m.startMockExam).not.toHaveBeenCalled();
    expect(m.submitMockExam).not.toHaveBeenCalled();
  });

  it("gives the overview the site shows, or not found", async () => {
    m.mockExamOverview.mockResolvedValue({ pathId: "p", questionCount: 6 });
    const res = await GET(new NextRequest(`${BASE}?slug=linux`));
    expect(await res.json()).toEqual({ ok: true, overview: { pathId: "p", questionCount: 6 } });
    expect(m.mockExamOverview).toHaveBeenCalledWith("u1", "linux");
    m.mockExamOverview.mockResolvedValue(null);
    expect((await GET(new NextRequest(BASE))).status).toBe(404);
  });

  it("starts an attempt and hands one in through the service", async () => {
    m.startMockExam.mockResolvedValue({ ok: true });
    expect((await POST(post(BASE, { pathId: "p" }))).status).toBe(200);
    expect(m.startMockExam).toHaveBeenCalledWith("u1", "p");
    m.submitMockExam.mockResolvedValue({ ok: false });
    const res = await submitRoute.POST(
      post(`${BASE}/submit`, { attemptId: "a", answers: { "0": 1 } }),
    );
    expect(res.status).toBe(400);
    expect(m.submitMockExam).toHaveBeenCalledWith("u1", "a", { "0": 1 });
  });
});
