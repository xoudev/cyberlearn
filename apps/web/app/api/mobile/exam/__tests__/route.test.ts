import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamStatus, StartQuizResult, SubmitQuizResult } from "@/lib/exam/exam-service";

const userFromBearer =
  vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>();
const examStatus = vi.fn<(userId: string, pathId: string) => Promise<ExamStatus>>();
const startExam = vi.fn<(userId: string, pathId: unknown) => Promise<StartQuizResult>>();
const submitExam =
  vi.fn<(userId: string, attemptId: unknown, answers: unknown) => Promise<SubmitQuizResult>>();
const claimCertificate =
  vi.fn<(userId: string, pathSlug: unknown) => Promise<{ ok: boolean; error?: string }>>();
const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();

vi.mock("../../_lib/auth", () => ({ userFromBearer: (r: Request) => userFromBearer(r) }));
vi.mock("@/lib/exam/exam-service", () => ({
  examStatus: (u: string, p: string) => examStatus(u, p),
  startExam: (u: string, p: unknown) => startExam(u, p),
  submitExam: (u: string, a: unknown, b: unknown) => submitExam(u, a, b),
}));
vi.mock("@/lib/certificates/claim", () => ({
  claimCertificate: (u: string, s: unknown) => claimCertificate(u, s),
}));
vi.mock("@cyberlearn/db", () => ({
  pathsVisibleTo: (userId: string) => ({ visibleTo: userId }),
  prisma: { path: { findFirst: (args: unknown) => findFirst(args) } },
}));

const { GET } = await import("../route");
const { POST: START } = await import("../start/route");
const { POST: SUBMIT } = await import("../submit/route");
const { POST: CLAIM } = await import("../claim/route");

const PATH = { id: "path-1", slug: "reseau-bases", title: "Les bases du réseau", refCode: "NET" };
const CATALOGUE_ROW = { ...PATH, audience: "CATALOGUE" };

function status(overrides: Partial<ExamStatus> = {}): ExamStatus {
  return {
    hasQuiz: true,
    lessonsComplete: true,
    pathCompleted: false,
    certPublicId: null,
    questionCount: 20,
    passThreshold: 70,
    timeLimitMinutes: 30,
    resumeStartedAt: null,
    cooldownUntil: null,
    ...overrides,
  };
}

function get(query: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/exam${query}`);
}

function post(path: string, body: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/exam${path}`, { method: "POST", body });
}

beforeEach(() => {
  userFromBearer.mockReset();
  examStatus.mockReset();
  startExam.mockReset();
  submitExam.mockReset();
  claimCertificate.mockReset();
  findFirst.mockReset();
});

describe("GET /api/mobile/exam", () => {
  it("refuses a caller with no valid token, and reads nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await GET(get("?slug=reseau-bases"))).status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
    expect(examStatus).not.toHaveBeenCalled();
  });

  it.each([[""], ["?slug="], ["?slug=Pas%20un%20slug"], [`?slug=${"a".repeat(121)}`]])(
    "refuses a missing or malformed slug (%s)",
    async (query) => {
      userFromBearer.mockResolvedValue({ id: "user-1", email: null });
      expect((await GET(get(query))).status).toBe(400);
      expect(findFirst).not.toHaveBeenCalled();
    },
  );

  it("looks the path up among those the token's user can see", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findFirst.mockResolvedValue(null);
    const res = await GET(get("?slug=parcours-de-classe"));
    expect(res.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "parcours-de-classe", visibleTo: "user-1" } }),
    );
    expect(examStatus).not.toHaveBeenCalled();
  });

  it("returns the path and its exam status, with dates as ISO strings", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findFirst.mockResolvedValue(CATALOGUE_ROW);
    examStatus.mockResolvedValue(
      status({
        resumeStartedAt: new Date("2026-09-24T10:00:00.000Z"),
        cooldownUntil: new Date("2026-09-26T10:00:00.000Z"),
      }),
    );
    const res = await GET(get("?slug=reseau-bases"));
    expect(res.status).toBe(200);
    expect(examStatus).toHaveBeenCalledWith("user-1", "path-1");
    const body = (await res.json()) as { path: unknown; status: Record<string, unknown> };
    expect(body.path).toEqual({ ...PATH, certifiable: true });
    expect(body.status.resumeStartedAt).toBe("2026-09-24T10:00:00.000Z");
    expect(body.status.cooldownUntil).toBe("2026-09-26T10:00:00.000Z");
    expect(body.status.questionCount).toBe(20);
  });

  it("says a class path carries no certificate", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findFirst.mockResolvedValue({ ...PATH, audience: "CLASS" });
    examStatus.mockResolvedValue(status({ hasQuiz: false }));
    const body = (await (await GET(get("?slug=reseau-bases"))).json()) as {
      path: Record<string, unknown>;
    };
    expect(body.path).toEqual({ ...PATH, certifiable: false });
  });

  it("keeps absent dates as null", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    findFirst.mockResolvedValue(CATALOGUE_ROW);
    examStatus.mockResolvedValue(status());
    const body = (await (await GET(get("?slug=reseau-bases"))).json()) as {
      status: Record<string, unknown>;
    };
    expect(body.status.resumeStartedAt).toBeNull();
    expect(body.status.cooldownUntil).toBeNull();
  });
});

describe("POST /api/mobile/exam/start", () => {
  it("refuses a caller with no valid token, and starts nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await START(post("/start", "{}"))).status).toBe(401);
    expect(startExam).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    expect((await START(post("/start", "pas du json"))).status).toBe(400);
    expect(startExam).not.toHaveBeenCalled();
  });

  it("starts as the token's user, never as one named in the body", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    startExam.mockResolvedValue({
      ok: true,
      attemptId: "attempt-1",
      questions: [],
      startedAt: new Date(),
    });
    const res = await START(
      post("/start", JSON.stringify({ pathId: "path-1", userId: "someone-else" })),
    );
    expect(res.status).toBe(200);
    expect(startExam).toHaveBeenCalledWith("user-1", "path-1");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.attemptId).toBe("attempt-1");
    expect(typeof body.startedAt).toBe("string");
  });

  it("counts the time left on the server's clock, for a resumed attempt too", async () => {
    vi.useFakeTimers({ now: new Date("2026-09-24T10:12:00.000Z"), toFake: ["Date"] });
    try {
      userFromBearer.mockResolvedValue({ id: "user-1", email: null });
      startExam.mockResolvedValue({
        ok: true,
        attemptId: "attempt-1",
        questions: [],
        startedAt: new Date("2026-09-24T10:00:00.000Z"),
      });
      const res = await START(post("/start", JSON.stringify({ pathId: "path-1" })));
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.startedAt).toBe("2026-09-24T10:00:00.000Z");
      expect(body.secondsLeft).toBe(18 * 60);
    } finally {
      vi.useRealTimers();
    }
  });

  it("hands a JSON null body to the service as a missing pathId", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    startExam.mockResolvedValue({ ok: false, error: "Parcours invalide." });
    await START(post("/start", "null"));
    expect(startExam).toHaveBeenCalledWith("user-1", undefined);
  });

  it("passes a refusal on with its message", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    startExam.mockResolvedValue({
      ok: false,
      error: "Examen déjà passé récemment. Réessaie après le délai d'attente.",
    });
    const res = await START(post("/start", JSON.stringify({ pathId: "path-1" })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Examen déjà passé récemment. Réessaie après le délai d'attente.",
    });
  });
});

describe("POST /api/mobile/exam/submit", () => {
  it("refuses a caller with no valid token, and scores nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await SUBMIT(post("/submit", "{}"))).status).toBe(401);
    expect(submitExam).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    expect((await SUBMIT(post("/submit", "pas du json"))).status).toBe(400);
    expect(submitExam).not.toHaveBeenCalled();
  });

  it("submits as the token's user, with the attempt and answers from the body", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    submitExam.mockResolvedValue({ ok: true, score: 80, passed: true, results: [] });
    const answers = { "q-1": "a", "q-2": "c" };
    const res = await SUBMIT(
      post("/submit", JSON.stringify({ attemptId: "attempt-1", answers, userId: "someone-else" })),
    );
    expect(res.status).toBe(200);
    expect(submitExam).toHaveBeenCalledWith("user-1", "attempt-1", answers);
    expect(await res.json()).toEqual({ ok: true, score: 80, passed: true, results: [] });
  });

  it("passes a refusal on with its message", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    submitExam.mockResolvedValue({ ok: false, error: "Temps écoulé." });
    const res = await SUBMIT(post("/submit", JSON.stringify({ attemptId: "attempt-1" })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Temps écoulé." });
  });
});

describe("POST /api/mobile/exam/claim", () => {
  it("refuses a caller with no valid token, and issues nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await CLAIM(post("/claim", "{}"))).status).toBe(401);
    expect(claimCertificate).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    expect((await CLAIM(post("/claim", "pas du json"))).status).toBe(400);
    expect(claimCertificate).not.toHaveBeenCalled();
  });

  it("claims as the token's user, never as one named in the body", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    claimCertificate.mockResolvedValue({ ok: true });
    const res = await CLAIM(
      post("/claim", JSON.stringify({ pathSlug: "reseau-bases", userId: "someone-else" })),
    );
    expect(res.status).toBe(200);
    expect(claimCertificate).toHaveBeenCalledWith("user-1", "reseau-bases");
  });

  it("passes a refusal on with its message", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    claimCertificate.mockResolvedValue({
      ok: false,
      error: "Un examen final est requis pour ce parcours.",
    });
    const res = await CLAIM(post("/claim", JSON.stringify({ pathSlug: "reseau-bases" })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Un examen final est requis pour ce parcours.",
    });
  });
});
