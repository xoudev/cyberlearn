import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recallAnswerReplySchema, recallReplySchema } from "@cyberlearn/types";
import type { RecallAnswerResult, RecallView } from "@/lib/revisions/daily-recall";

/** /api/mobile/review-cards: the app's day's recall and module review, through the site's service. */

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  openDailyRecall: vi.fn<(userId: string) => Promise<unknown>>(),
  openModuleReview: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
  answerDailyRecall: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
  answerModuleReview: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/revisions/daily-recall", () => ({
  openDailyRecall: m.openDailyRecall,
  openModuleReview: m.openModuleReview,
  answerDailyRecall: m.answerDailyRecall,
  answerModuleReview: m.answerModuleReview,
}));

const { GET, POST } = await import("../route");

const URL_BASE = "https://cyberlearn.fr/api/mobile/review-cards";
const LESSON = "22222222-2222-4222-8222-222222222222";
const VERDICT = {
  index: 0,
  selected: 1,
  correct: true,
  correctIndex: 1,
  explanation: null,
  passage: {
    lessonTitle: "Les permissions",
    href: "/lessons/linux-permissions?section=2#quiz-q-1",
  },
};

function get(query = ""): NextRequest {
  return new NextRequest(`${URL_BASE}${query}`);
}

function post(body: string): NextRequest {
  return new NextRequest(URL_BASE, { method: "POST", body });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/review-cards", () => {
  it("refuses a caller with no valid token, and draws nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
    expect(m.openDailyRecall).not.toHaveBeenCalled();
  });

  it("gives the token's user their day's recall", async () => {
    m.openDailyRecall.mockResolvedValue({ mode: "daily", status: "open" });
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, recall: { mode: "daily", status: "open" } });
    expect(m.openDailyRecall).toHaveBeenCalledWith("user-1");
  });

  it("gives a module's review when a path and a module are named", async () => {
    m.openModuleReview.mockResolvedValue({ mode: "module", status: "open" });
    const res = await GET(get("?path=linux-fondamentaux&module=2"));
    expect(res.status).toBe(200);
    expect(m.openModuleReview).toHaveBeenCalledWith("user-1", {
      path: "linux-fondamentaux",
      module: 2,
    });
    expect(m.openDailyRecall).not.toHaveBeenCalled();
  });

  it("refuses a module named by halves, or by a number that is not one", async () => {
    for (const query of ["?path=linux", "?module=2", "?path=linux&module=0", "?path=&module=x"]) {
      expect((await GET(get(query))).status).toBe(400);
    }
    expect(m.openModuleReview).not.toHaveBeenCalled();
  });
});

describe("POST /api/mobile/review-cards", () => {
  it("refuses a caller with no valid token, and records nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(post("{}"))).status).toBe(401);
    expect(m.answerDailyRecall).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON, or not an answer", async () => {
    expect((await POST(post("pas du json"))).status).toBe(400);
    expect((await POST(post(JSON.stringify({ index: -1, selected: 0 })))).status).toBe(400);
    expect(
      (await POST(post(JSON.stringify({ path: "linux", index: 0, selected: 0 })))).status,
    ).toBe(400);
    expect(m.answerDailyRecall).not.toHaveBeenCalled();
    expect(m.answerModuleReview).not.toHaveBeenCalled();
  });

  it("answers the day's recall as the token's user, whatever user the body names", async () => {
    m.answerDailyRecall.mockResolvedValue({
      ok: true,
      verdict: VERDICT,
      result: { correct: 4, total: 6, xp: 15 },
    });
    const res = await POST(post(JSON.stringify({ index: 0, selected: 1, userId: "someone" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      verdict: VERDICT,
      result: { correct: 4, total: 6, xp: 15 },
    });
    expect(m.answerDailyRecall).toHaveBeenCalledWith("user-1", { index: 0, selected: 1 });
  });

  it("answers a module's review when the body names its module", async () => {
    m.answerModuleReview.mockResolvedValue({ ok: true, verdict: VERDICT, result: null });
    const body = {
      path: "linux-fondamentaux",
      module: 2,
      day: "2026-10-17",
      index: 0,
      lessonId: LESSON,
      quizId: "q-1",
      selected: 1,
    };
    const res = await POST(post(JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(m.answerModuleReview).toHaveBeenCalledWith("user-1", body);
    expect(m.answerDailyRecall).not.toHaveBeenCalled();
  });

  it("says why nothing was recorded", async () => {
    m.answerDailyRecall.mockResolvedValue({
      ok: false,
      error: "Tu as déjà répondu à cette question.",
    });
    const res = await POST(post(JSON.stringify({ index: 0, selected: 1 })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Tu as déjà répondu à cette question." });
  });
});

describe("what the app reads of the replies", () => {
  // Typed by the service, parsed with the app's schemas (@cyberlearn/types):
  // a field the service renames or drops fails here, not on a phone.
  const view: RecallView = {
    mode: "daily",
    status: "done",
    day: "2026-10-17",
    title: "Rappel du jour",
    module: null,
    questions: [
      {
        index: 0,
        lessonId: LESSON,
        quizId: "q-1",
        lessonTitle: "Les permissions",
        question: "Que donne chmod 600 ?",
        options: ["rwx --- ---", "rw- --- ---"],
      },
    ],
    verdicts: [VERDICT],
    result: { correct: 1, total: 1, xp: 15 },
  };

  it("parses the day's recall as the app does", async () => {
    m.openDailyRecall.mockResolvedValue(view);
    const reply: unknown = await (await GET(get())).json();
    expect(recallReplySchema.safeParse(reply).success).toBe(true);
  });

  it("parses a verdict and a refusal as the app does", async () => {
    const answered: RecallAnswerResult = { ok: true, verdict: VERDICT, result: view.result };
    m.answerDailyRecall.mockResolvedValue(answered);
    const reply: unknown = await (
      await POST(post(JSON.stringify({ index: 0, selected: 1 })))
    ).json();
    expect(recallAnswerReplySchema.safeParse(reply).success).toBe(true);

    const refusal: RecallAnswerResult = { ok: false, error: "Ce rappel n'est plus celui du jour." };
    m.answerDailyRecall.mockResolvedValue(refusal);
    const refused: unknown = await (
      await POST(post(JSON.stringify({ index: 0, selected: 1 })))
    ).json();
    expect(recallAnswerReplySchema.safeParse(refused).success).toBe(true);
  });
});
