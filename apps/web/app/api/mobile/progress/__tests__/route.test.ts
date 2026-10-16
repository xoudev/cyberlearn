import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompleteLessonOutcome, CompleteLessonResult } from "@/lib/lessons/complete";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  completeLessonForUser: vi.fn<(u: string, l: string) => Promise<CompleteLessonOutcome>>(),
  logError: vi.fn(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/lessons/complete", () => ({ completeLessonForUser: m.completeLessonForUser }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: m.logError }),
}));

const { POST } = await import("../route");

const URL = "https://cyberlearn.fr/api/mobile/progress";
const LESSON_ID = "11111111-1111-4111-8111-111111111111";

const RESULT: CompleteLessonResult = {
  alreadyCompleted: false,
  xpGained: 20,
  leveledUp: false,
  newLevel: 3,
  newBadges: [],
  quizScore: null,
};

function post(body: unknown): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("POST /api/mobile/progress", () => {
  it("refuses a caller the gate turns away, without completing anything", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(post({ lessonId: LESSON_ID }))).status).toBe(401);
    expect(m.completeLessonForUser).not.toHaveBeenCalled();
  });

  it("refuses a body that is not a lesson id", async () => {
    expect((await POST(post({ lessonId: "lesson-1" }))).status).toBe(400);
    expect((await POST(post("{"))).status).toBe(400);
    expect(m.completeLessonForUser).not.toHaveBeenCalled();
  });

  it("returns the completion for the reward screen", async () => {
    m.completeLessonForUser.mockResolvedValue({ ok: true, result: RESULT });

    const res = await POST(post({ lessonId: LESSON_ID }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: RESULT });
    expect(m.completeLessonForUser).toHaveBeenCalledWith("user-1", LESSON_ID);
  });

  it("answers a locked lesson with ok false and the path to finish first", async () => {
    // The app reads ok false as "not synchronised": a completion that was
    // never recorded no longer shows as "+0 XP, Niveau 1, enregistrée".
    const error =
      "Cette leçon est verrouillée : termine d'abord la précédente du parcours « Python : les bases ».";
    m.completeLessonForUser.mockResolvedValue({ ok: false, refused: "locked", error });

    const res = await POST(post({ lessonId: LESSON_ID }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error });
  });

  it("answers a lesson the reader may not open with ok false", async () => {
    m.completeLessonForUser.mockResolvedValue({
      ok: false,
      refused: "unreadable",
      error: "Leçon introuvable.",
    });

    const res = await POST(post({ lessonId: LESSON_ID }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "Leçon introuvable." });
  });

  it("answers an account with no row to credit with ok false", async () => {
    m.completeLessonForUser.mockResolvedValue({
      ok: false,
      refused: "no-account",
      error: "Compte introuvable.",
    });

    const res = await POST(post({ lessonId: LESSON_ID }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "Compte introuvable." });
  });

  it("logs a failure without handing it to the client", async () => {
    m.completeLessonForUser.mockRejectedValue(new Error("connection reset"));

    const res = await POST(post({ lessonId: LESSON_ID }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Enregistrement impossible." });
    expect(m.logError).toHaveBeenCalledTimes(1);
  });
});
