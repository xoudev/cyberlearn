import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The route over the real lock guard (lib/lessons/access), only the database
 * mocked: what the app reads from GET (the placement waivers) and from POST
 * (the locks) must tell one story. A lesson the placement test waived opens
 * the one after it, as a completed lesson does, in the locks as in the list of
 * waivers - the site's pages, the server's completion check and the app all
 * apply the same rule.
 */

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findRoleById: vi.fn<(id: string) => Promise<{ role: string } | null>>(),
  findPathContexts: vi.fn(),
  findWaivedLessonIds: vi.fn<(userId: string) => Promise<string[]>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: vi.fn() }),
}));
vi.mock("@cyberlearn/db", () => ({
  userRepository: { findRoleById: m.findRoleById },
  lessonRepository: {
    findPathContexts: m.findPathContexts,
    findWaivedLessonIds: m.findWaivedLessonIds,
  },
}));

const { GET, POST } = await import("../route");

const URL = "https://cyberlearn.fr/api/mobile/lesson-access";
const L1 = "11111111-1111-4111-8111-111111111111";
const L2 = "22222222-2222-4222-8222-222222222222";
const L3 = "33333333-3333-4333-8333-333333333333";
const L4 = "44444444-4444-4444-8444-444444444444";

/** One path, L1 → L2 → L3 → L4. */
const PATH = {
  id: "p1",
  slug: "python-bases",
  title: "Python : les bases",
  lessons: [L1, L2, L3, L4].map((id, i) => ({ position: i + 1, lesson: { id } })),
};

const LOCK = { slug: "python-bases", title: "Python : les bases" };

function locksFor(lessonIds: string[]): NextRequest {
  return new NextRequest(URL, { method: "POST", body: JSON.stringify({ lessonIds }) });
}

function setProgress(progress: { completed: string[]; waived: string[] }): void {
  m.findPathContexts.mockResolvedValue({
    paths: [PATH],
    completedLessonIds: progress.completed,
    waivedLessonIds: progress.waived,
  });
  m.findWaivedLessonIds.mockResolvedValue(progress.waived);
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
  m.findRoleById.mockResolvedValue({ role: "STUDENT" });
});

describe("/api/mobile/lesson-access, waivers and locks together", () => {
  it("lists the waivers on GET and counts them as done in the POST locks", async () => {
    // L1 completed, L2 waived by the placement test: L3 opens behind the waived L2, L4 does not.
    setProgress({ completed: [L1], waived: [L2] });

    expect(await (await GET(new NextRequest(URL))).json()).toEqual({
      ok: true,
      unlockAll: false,
      waivedLessonIds: [L2],
    });

    const res = await POST(locksFor([L1, L2, L3, L4]));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, locked: { [L4]: LOCK } });
  });

  it("opens a waived lesson with nothing completed before it", async () => {
    setProgress({ completed: [], waived: [L3] });
    expect(await (await POST(locksFor([L2, L3, L4]))).json()).toEqual({
      ok: true,
      locked: { [L2]: LOCK },
    });
  });

  it("locks what the path locks when nothing was waived", async () => {
    setProgress({ completed: [L1], waived: [] });
    expect(await (await GET(new NextRequest(URL))).json()).toEqual({
      ok: true,
      unlockAll: false,
      waivedLessonIds: [],
    });
    expect(await (await POST(locksFor([L2, L3, L4]))).json()).toEqual({
      ok: true,
      locked: { [L3]: LOCK, [L4]: LOCK },
    });
  });

  it("leaves nothing locked to an administrator, waivers or not", async () => {
    m.findRoleById.mockResolvedValue({ role: "ADMIN" });
    setProgress({ completed: [], waived: [] });
    expect(await (await GET(new NextRequest(URL))).json()).toEqual({
      ok: true,
      unlockAll: true,
      waivedLessonIds: [],
    });
    expect(await (await POST(locksFor([L2, L3, L4]))).json()).toEqual({ ok: true, locked: {} });
  });
});
