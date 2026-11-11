import { beforeEach, describe, expect, it, vi } from "vitest";

const CLASS_ID = "22222222-2222-4222-8222-222222222222";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  assurance: vi.fn(),
  findActiveBan: vi.fn(),
  findGradebook: vi.fn(),
  limit: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: { getUser: m.getUser, mfa: { getAuthenticatorAssuranceLevel: m.assurance } },
    }),
}));
vi.mock("@cyberlearn/db", () => ({
  banRepository: { findActive: m.findActiveBan },
  classRepository: { findGradebook: m.findGradebook },
}));
vi.mock("@/lib/rate-limit", () => ({ checkClassExport: m.limit }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ info: m.info }),
}));

const { GET } = await import("../route");

function get(id: string = CLASS_ID): Promise<Response> {
  return GET(new Request(`https://cyberlearn.fr/api/classes/${id}/export`), {
    params: Promise.resolve({ id }),
  });
}

const GRADEBOOK = {
  name: "BTS SIO 2",
  students: [
    {
      id: "u1",
      displayName: "Alice Martin",
      username: "alice",
      level: 4,
      xpTotal: 620,
      streakDays: 3,
      lastActiveAt: new Date("2026-11-10T09:00:00Z"),
      completedLessons: 12,
    },
  ],
  work: [{ lessonId: "l1", title: "Les permissions", dueAt: null }],
  completions: [
    {
      userId: "u1",
      lessonId: "l1",
      completedAt: new Date("2026-11-08T10:00:00Z"),
      quizCorrect: 4,
      quizTotal: 5,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ data: { user: { id: "teacher" } } });
  m.assurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
  m.findActiveBan.mockResolvedValue(null);
  m.limit.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
  m.findGradebook.mockResolvedValue(GRADEBOOK);
});

describe("GET /api/classes/[id]/export", () => {
  it("hands the class's teacher a CSV file named after the class", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="classe-bts-sio-2-\d{4}-\d{2}-\d{2}\.csv"$/u,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toContain(
      '"Alice Martin";"alice";"4";"620";"3";"10/11/2026";"12";"1/1";"08/11/2026";"4/5"',
    );
    expect(m.findGradebook).toHaveBeenCalledWith(CLASS_ID, "teacher");
  });

  it("leaves a line in the log, without the students' names", async () => {
    await get();
    expect(m.info).toHaveBeenCalledWith(
      { scope: "classes/export", classId: CLASS_ID, actorId: "teacher", students: 1 },
      "class progress exported",
    );
  });

  it("is not found for a visitor", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    expect((await get()).status).toBe(404);
    expect(m.findGradebook).not.toHaveBeenCalled();
  });

  it("is not found for a session that still owes its second factor", async () => {
    m.assurance.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    expect((await get()).status).toBe(404);
    expect(m.findGradebook).not.toHaveBeenCalled();
  });

  it("is not found for a banned account", async () => {
    m.findActiveBan.mockResolvedValue({ id: "ban" });
    expect((await get()).status).toBe(404);
    expect(m.findGradebook).not.toHaveBeenCalled();
  });

  it("is not found for a class this account does not teach, or that does not exist", async () => {
    m.findGradebook.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });

  it("is not found for an id that is not one, without asking anything", async () => {
    expect((await get("../etc")).status).toBe(404);
    expect(m.getUser).not.toHaveBeenCalled();
  });

  it("says when to come back once the hour's exports are spent", async () => {
    m.limit.mockResolvedValue({ success: false, retryAfterSeconds: 120 });
    const response = await get();
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(m.findGradebook).not.toHaveBeenCalled();
  });
});
