import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userFromBearer =
  vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>();
const reportQuiz =
  vi.fn<(userId: string, input: unknown) => Promise<{ ok: true } | { ok: false; error: string }>>();

vi.mock("../../_lib/auth", () => ({ userFromBearer: (r: Request) => userFromBearer(r) }));
vi.mock("@/lib/lessons/quiz-report", () => ({
  reportQuiz: (u: string, i: unknown) => reportQuiz(u, i),
}));

const { POST } = await import("../route");

function request(body: string): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/quiz-report", { method: "POST", body });
}

beforeEach(() => {
  userFromBearer.mockReset();
  reportQuiz.mockReset();
});

describe("POST /api/mobile/quiz-report", () => {
  it("refuses a caller with no valid token, and records nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await POST(request("{}"))).status).toBe(401);
    expect(reportQuiz).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    expect((await POST(request("pas du json"))).status).toBe(400);
    expect(reportQuiz).not.toHaveBeenCalled();
  });

  it("reports as the token's user, never as one named in the body", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    reportQuiz.mockResolvedValue({ ok: true });
    const body = { lessonId: "l", quizId: "q-1", reason: "TYPO", userId: "someone-else" };
    const res = await POST(request(JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(reportQuiz).toHaveBeenCalledWith("user-1", body);
  });

  it("passes a refusal on with its message", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    reportQuiz.mockResolvedValue({ ok: false, error: "Leçon introuvable." });
    const res = await POST(request("{}"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Leçon introuvable." });
  });
});
