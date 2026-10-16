import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  unlocksEveryLesson: vi.fn<(u: string) => Promise<boolean>>(),
  waivedLessonIds: vi.fn<(u: string) => Promise<string[]>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/lessons/access", () => ({
  unlocksEveryLesson: m.unlocksEveryLesson,
  waivedLessonIds: m.waivedLessonIds,
}));

const { GET } = await import("../route");

const URL = "https://cyberlearn.fr/api/mobile/lesson-access";

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
