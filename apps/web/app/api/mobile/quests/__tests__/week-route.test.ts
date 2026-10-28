import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findWeek: vi.fn<(userId: string, weekKey: string, previous: string) => Promise<unknown[]>>(),
  error: vi.fn(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({ questRepository: { findWeek: m.findWeek } }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: m.error }),
}));

const { GET } = await import("../route");

const request = (): NextRequest => new NextRequest("https://cyberlearn.fr/api/mobile/quests");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/quests", () => {
  it("refuses a caller the gate turns away, and reads nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(m.findWeek).not.toHaveBeenCalled();
  });

  it("returns the week's quests with the caller's progress, for this week and the one before", async () => {
    m.findWeek.mockResolvedValue([
      {
        id: "q-1",
        code: "LESSONS_2",
        title: "Termine 2 leçons",
        description: "…",
        type: "LESSON_COMPLETED",
        target: 2,
        xpReward: 200,
        freezeReward: 0,
        orderIndex: 1,
        progress: 1,
        completed: false,
        claimed: false,
      },
    ]);
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      quests: [
        {
          id: "q-1",
          title: "Termine 2 leçons",
          type: "LESSON_COMPLETED",
          target: 2,
          xpReward: 200,
          freezeReward: 0,
          progress: 1,
          completed: false,
          claimed: false,
        },
      ],
    });
    const [userId, week, previous] = m.findWeek.mock.calls[0] ?? [];
    expect(userId).toBe("user-1");
    expect(week).toMatch(/^\d{4}-W\d{2}$/u);
    expect(previous).toMatch(/^\d{4}-W\d{2}$/u);
    expect(previous).not.toBe(week);
  });

  it("says the quests could not be read, without the error", async () => {
    m.findWeek.mockRejectedValue(new Error("db down"));
    const res = await GET(request());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("db down");
    expect(m.error).toHaveBeenCalled();
  });
});
