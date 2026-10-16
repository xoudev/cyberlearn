import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompleteLessonResult } from "@/lib/lessons/complete";

/**
 * The app finishing a lesson. It lists every lesson, the path lock aside, so
 * it can finish one the flow refuses: the refusal has to reach it as one, not
 * as a completion worth 0 XP that it announces as saved.
 */

const userFromBearer =
  vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>();
const completeLessonForUser =
  vi.fn<(userId: string, lessonId: string) => Promise<CompleteLessonResult>>();

vi.mock("../../_lib/auth", () => ({ userFromBearer: (r: Request) => userFromBearer(r) }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: vi.fn() }),
}));
vi.mock("@/lib/lessons/complete", () => ({
  completeLessonForUser: (u: string, l: string) => completeLessonForUser(u, l),
}));

const { POST } = await import("../route");

const LESSON = "11111111-1111-4111-8111-111111111111";

const DONE: CompleteLessonResult = {
  alreadyCompleted: false,
  xpGained: 20,
  leveledUp: false,
  newLevel: 2,
  newBadges: [],
  quizScore: { correct: 2, total: 3 },
  refusal: null,
};

function request(body: string): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/progress", { method: "POST", body });
}

beforeEach(() => {
  userFromBearer.mockReset();
  completeLessonForUser.mockReset();
  userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("POST /api/mobile/progress", () => {
  it("refuses a caller with no valid token, and completes nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await POST(request(JSON.stringify({ lessonId: LESSON })))).status).toBe(401);
    expect(completeLessonForUser).not.toHaveBeenCalled();
  });

  it("refuses a lesson id that is not one", async () => {
    expect((await POST(request(JSON.stringify({ lessonId: "lesson" })))).status).toBe(400);
    expect(completeLessonForUser).not.toHaveBeenCalled();
  });

  it("completes as the token's user and answers the result", async () => {
    completeLessonForUser.mockResolvedValue(DONE);
    const res = await POST(request(JSON.stringify({ lessonId: LESSON, userId: "someone-else" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: DONE });
    expect(completeLessonForUser).toHaveBeenCalledWith("user-1", LESSON);
  });

  it("says why a lesson still locked in its path was not completed", async () => {
    completeLessonForUser.mockResolvedValue({
      ...DONE,
      xpGained: 0,
      quizScore: null,
      refusal: "Termine d'abord la leçon précédente du parcours.",
    });
    const res = await POST(request(JSON.stringify({ lessonId: LESSON })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Termine d'abord la leçon précédente du parcours.",
    });
  });

  it("answers a 500 when the completion fails, without its details", async () => {
    completeLessonForUser.mockRejectedValue(new Error("connection reset"));
    const res = await POST(request(JSON.stringify({ lessonId: LESSON })));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Enregistrement impossible." });
  });
});
