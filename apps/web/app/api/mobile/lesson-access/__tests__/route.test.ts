import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface Lock {
  slug: string;
  title: string;
}

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  unlocksEveryLesson: vi.fn<(u: string) => Promise<boolean>>(),
  waivedLessonIds: vi.fn<(u: string) => Promise<string[]>>(),
  lessonLocks: vi.fn<(u: string, ids: readonly string[]) => Promise<Map<string, Lock>>>(),
  logError: vi.fn(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/lessons/access", () => ({
  unlocksEveryLesson: m.unlocksEveryLesson,
  waivedLessonIds: m.waivedLessonIds,
  lessonLocks: m.lessonLocks,
}));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: m.logError }),
}));

const { GET, POST } = await import("../route");

const URL = "https://cyberlearn.fr/api/mobile/lesson-access";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function post(body: unknown): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
  m.waivedLessonIds.mockResolvedValue([]);
});

describe("GET /api/mobile/lesson-access", () => {
  it("refuses a caller the gate turns away, without looking up a role", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(new NextRequest(URL))).status).toBe(401);
    expect(m.unlocksEveryLesson).not.toHaveBeenCalled();
    expect(m.waivedLessonIds).not.toHaveBeenCalled();
  });

  it("opens everything to an administrator", async () => {
    m.unlocksEveryLesson.mockResolvedValue(true);
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, unlockAll: true, waivedLessonIds: [] });
    expect(m.unlocksEveryLesson).toHaveBeenCalledWith("user-1");
  });

  it("keeps the lock for anyone else", async () => {
    m.unlocksEveryLesson.mockResolvedValue(false);
    expect(await (await GET(new NextRequest(URL))).json()).toEqual({
      ok: true,
      unlockAll: false,
      waivedLessonIds: [],
    });
  });

  it("hands the app the lessons the placement test waived for the caller", async () => {
    m.unlocksEveryLesson.mockResolvedValue(false);
    m.waivedLessonIds.mockResolvedValue(["lesson-a", "lesson-b"]);
    expect(await (await GET(new NextRequest(URL))).json()).toEqual({
      ok: true,
      unlockAll: false,
      waivedLessonIds: ["lesson-a", "lesson-b"],
    });
    expect(m.waivedLessonIds).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/mobile/lesson-access", () => {
  it("refuses a caller the gate turns away, without reading a lock", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(post({ lessonIds: [A] }))).status).toBe(401);
    expect(m.lessonLocks).not.toHaveBeenCalled();
  });

  it("names the path of each locked lesson, for the caller", async () => {
    m.lessonLocks.mockResolvedValue(
      new Map([[B, { slug: "python-bases", title: "Python : les bases" }]]),
    );
    const res = await POST(post({ lessonIds: [A, B, A] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      locked: { [B]: { slug: "python-bases", title: "Python : les bases" } },
    });
    expect(m.lessonLocks).toHaveBeenCalledWith("user-1", [A, B]);
  });

  it("refuses a body that is not a list of lesson ids", async () => {
    for (const body of ["pas du json", {}, { lessonIds: [] }, { lessonIds: ["x"] }]) {
      expect((await POST(post(body))).status).toBe(400);
    }
    const tooMany = Array.from({ length: 101 }, () => A);
    expect((await POST(post({ lessonIds: tooMany }))).status).toBe(400);
    expect(m.lessonLocks).not.toHaveBeenCalled();
  });

  it("says a failed read failed, without its detail", async () => {
    m.lessonLocks.mockRejectedValue(new Error("connexion perdue"));
    const res = await POST(post({ lessonIds: [A] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Lecture impossible." });
    expect(m.logError).toHaveBeenCalled();
  });
});
