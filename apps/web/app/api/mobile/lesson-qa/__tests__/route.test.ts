import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findLesson: vi.fn<(args: unknown) => Promise<{ id: string } | null>>(),
  findQuestionsByLesson: vi.fn<(lessonId: string) => Promise<unknown[]>>(),
  findUserLessonRating:
    vi.fn<(u: string, l: string) => Promise<{ score: number; feedback: string | null } | null>>(),
  findLessonStats:
    vi.fn<(l: string) => Promise<{ avgRating: number; ratingsCount: number } | null>>(),
  rateLessonForUser: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
  postLessonQuestion: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
  postLessonAnswer: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
  acceptLessonAnswer: vi.fn<(u: string, id: unknown) => Promise<unknown>>(),
  upvoteLessonAnswer: vi.fn<(u: string, id: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({
  lessonsVisibleTo: (userId: string) => ({ visibleTo: userId }),
  prisma: { lesson: { findFirst: m.findLesson } },
  qaRepository: { findQuestionsByLesson: m.findQuestionsByLesson },
  ratingRepository: {
    findUserLessonRating: m.findUserLessonRating,
    findLessonStats: m.findLessonStats,
  },
}));
vi.mock("@/lib/lessons/rate-lesson", () => ({ rateLessonForUser: m.rateLessonForUser }));
vi.mock("@/lib/lessons/qa", () => ({
  postLessonQuestion: m.postLessonQuestion,
  postLessonAnswer: m.postLessonAnswer,
  acceptLessonAnswer: m.acceptLessonAnswer,
  upvoteLessonAnswer: m.upvoteLessonAnswer,
}));

const { GET: QA } = await import("../route");
const { POST: ASK } = await import("../question/route");
const { POST: ANSWER } = await import("../answer/route");
const { POST: ACCEPT } = await import("../accept/route");
const { POST: UPVOTE } = await import("../upvote/route");
const { GET: MY_RATING, POST: RATE } = await import("../../lesson-rating/route");

const LESSON_ID = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";

function get(url: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/${url}`);
}
function post(url: string, body: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/${url}`, { method: "POST", body });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
  m.findLesson.mockResolvedValue({ id: LESSON_ID });
});

describe("every lesson Q&A and rating route", () => {
  it.each([
    ["Q&A", () => QA(get(`lesson-qa?lessonId=${LESSON_ID}`))],
    ["ask", () => ASK(post("lesson-qa/question", "{}"))],
    ["answer", () => ANSWER(post("lesson-qa/answer", "{}"))],
    ["accept", () => ACCEPT(post("lesson-qa/accept", "{}"))],
    ["upvote", () => UPVOTE(post("lesson-qa/upvote", "{}"))],
    ["my rating", () => MY_RATING(get(`lesson-rating?lessonId=${LESSON_ID}`))],
    ["rate", () => RATE(post("lesson-rating", "{}"))],
  ])("refuses a caller the gate turns away (%s): no token, or banned", async (_n, call) => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    for (const fn of [
      m.findLesson,
      m.rateLessonForUser,
      m.postLessonQuestion,
      m.postLessonAnswer,
      m.acceptLessonAnswer,
      m.upvoteLessonAnswer,
    ]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it.each([
    ["ask", () => ASK(post("lesson-qa/question", "pas du json"))],
    ["answer", () => ANSWER(post("lesson-qa/answer", "pas du json"))],
    ["accept", () => ACCEPT(post("lesson-qa/accept", "pas du json"))],
    ["upvote", () => UPVOTE(post("lesson-qa/upvote", "pas du json"))],
    ["rate", () => RATE(post("lesson-rating", "pas du json"))],
  ])("refuses a body that is not JSON (%s)", async (_n, call) => {
    expect((await call()).status).toBe(400);
  });

  it.each([
    ["Q&A", () => QA(get("lesson-qa?lessonId=abc"))],
    ["my rating", () => MY_RATING(get("lesson-rating"))],
  ])("refuses a lesson id that is not one (%s)", async (_n, call) => {
    expect((await call()).status).toBe(400);
    expect(m.findLesson).not.toHaveBeenCalled();
  });

  it.each([
    ["Q&A", () => QA(get(`lesson-qa?lessonId=${LESSON_ID}`))],
    ["my rating", () => MY_RATING(get(`lesson-rating?lessonId=${LESSON_ID}`))],
  ])("answers 404 for a lesson the reader cannot see (%s)", async (_n, call) => {
    m.findLesson.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
    expect(m.findLesson).toHaveBeenCalledWith({
      where: { id: LESSON_ID, visibleTo: "user-1" },
      select: { id: true },
    });
  });
});

describe("GET /api/mobile/lesson-qa", () => {
  it("lists the questions, marks the reader's own, names as the site does", async () => {
    const asker = { id: "user-1", displayName: null, username: "alex", level: 3 };
    const helper = { id: "user-2", displayName: "Sam", username: "sam", level: 9 };
    m.findQuestionsByLesson.mockResolvedValue([
      {
        id: "q-1",
        title: "Pourquoi trois échanges ?",
        content: "…",
        isResolved: true,
        createdAt: new Date("2026-09-20T08:00:00.000Z"),
        user: asker,
        _count: { answers: 1 },
        answers: [
          {
            id: "a-1",
            content: "Pour confirmer.",
            isAccepted: true,
            upvotes: 2,
            createdAt: new Date("2026-09-21T08:00:00.000Z"),
            user: helper,
          },
        ],
      },
      {
        id: "q-2",
        title: "Question d'un compte supprimé",
        content: "…",
        isResolved: false,
        createdAt: new Date("2026-09-22T08:00:00.000Z"),
        user: null,
        _count: { answers: 0 },
        answers: [],
      },
    ]);
    const body = (await (await QA(get(`lesson-qa?lessonId=${LESSON_ID}`))).json()) as {
      questions: {
        mine: boolean;
        author: unknown;
        createdAt: string;
        answers: { mine: boolean; author: unknown }[];
      }[];
    };
    expect(m.findQuestionsByLesson).toHaveBeenCalledWith(LESSON_ID);
    expect(body.questions[0]).toMatchObject({
      mine: true,
      author: { id: "user-1", name: "alex", level: 3 },
      createdAt: "2026-09-20T08:00:00.000Z",
    });
    expect(body.questions[0]?.answers[0]).toMatchObject({
      mine: false,
      author: { id: "user-2", name: "Sam", level: 9 },
    });
    expect(body.questions[1]).toMatchObject({ mine: false, author: null });
  });
});

describe("writing", () => {
  it.each([
    [
      "ask",
      () => ASK(post("lesson-qa/question", JSON.stringify({ lessonId: "l", userId: "x" }))),
      m.postLessonQuestion,
      { lessonId: "l", userId: "x" },
    ],
    [
      "answer",
      () => ANSWER(post("lesson-qa/answer", JSON.stringify({ questionId: "q" }))),
      m.postLessonAnswer,
      { questionId: "q" },
    ],
    [
      "rate",
      () => RATE(post("lesson-rating", JSON.stringify({ lessonId: "l", score: 4 }))),
      m.rateLessonForUser,
      { lessonId: "l", score: 4 },
    ],
  ])("%s as the token's user", async (_n, call, service, body) => {
    service.mockResolvedValue({ ok: true });
    expect((await call()).status).toBe(200);
    expect(service).toHaveBeenCalledWith("user-1", body);
  });

  it.each([
    [
      "accept",
      () => ACCEPT(post("lesson-qa/accept", JSON.stringify({ answerId: "a-1" }))),
      m.acceptLessonAnswer,
    ],
    [
      "upvote",
      () => UPVOTE(post("lesson-qa/upvote", JSON.stringify({ answerId: "a-1" }))),
      m.upvoteLessonAnswer,
    ],
  ])("%s as the token's user, on the answer named", async (_n, call, service) => {
    service.mockResolvedValue({ ok: true });
    expect((await call()).status).toBe(200);
    expect(service).toHaveBeenCalledWith("user-1", "a-1");
  });

  it("passes a refusal on with its message", async () => {
    m.postLessonAnswer.mockResolvedValue({ ok: false, error: "Question introuvable." });
    const res = await ANSWER(post("lesson-qa/answer", "{}"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Question introuvable." });
    m.rateLessonForUser.mockResolvedValue({
      ok: false,
      error: "Tu dois compléter la leçon avant de la noter.",
    });
    expect((await RATE(post("lesson-rating", "{}"))).status).toBe(403);
  });
});

describe("GET /api/mobile/lesson-rating", () => {
  it("returns the reader's own rating and the lesson's average", async () => {
    m.findUserLessonRating.mockResolvedValue({ score: 4, feedback: "Clair." });
    m.findLessonStats.mockResolvedValue({ avgRating: 4.5, ratingsCount: 8 });
    const res = await MY_RATING(get(`lesson-rating?lessonId=${LESSON_ID}`));
    expect(await res.json()).toEqual({
      ok: true,
      score: 4,
      feedback: "Clair.",
      avgRating: 4.5,
      ratingsCount: 8,
    });
    expect(m.findUserLessonRating).toHaveBeenCalledWith("user-1", LESSON_ID);
  });
});
