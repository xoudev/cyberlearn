import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  findForUser: vi.fn<(userId: string) => Promise<unknown[]>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({ moderationRepository: { findForUser: m.findForUser } }));

const { GET } = await import("../route");

const request = (): NextRequest => new NextRequest("https://cyberlearn.fr/api/mobile/moderation");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/moderation", () => {
  it("refuses a caller the gate turns away: no token, or banned", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(m.findForUser).not.toHaveBeenCalled();
  });

  it("reads the caller's own record and sends what the page shows, dates in ISO", async () => {
    m.findForUser.mockResolvedValue([
      {
        id: "ev-1",
        surface: "forum.post",
        excerpt: "un extrait",
        outcome: "UPHELD",
        createdAt: new Date("2026-09-20T10:00:00Z"),
        reviewedAt: new Date("2026-09-21T08:30:00Z"),
        // Never selected by the repository; must not leak if it ever were.
        score: 0.97,
        rules: ["insult"],
      },
      {
        id: "ev-2",
        surface: "lesson.answer",
        excerpt: "autre",
        outcome: "PENDING",
        createdAt: new Date("2026-09-22T10:00:00Z"),
        reviewedAt: null,
      },
    ]);

    const res = await GET(request());
    expect(m.findForUser).toHaveBeenCalledWith("user-1");
    expect(await res.json()).toEqual({
      ok: true,
      events: [
        {
          id: "ev-1",
          surface: "forum.post",
          excerpt: "un extrait",
          outcome: "UPHELD",
          createdAt: "2026-09-20T10:00:00.000Z",
          reviewedAt: "2026-09-21T08:30:00.000Z",
        },
        {
          id: "ev-2",
          surface: "lesson.answer",
          excerpt: "autre",
          outcome: "PENDING",
          createdAt: "2026-09-22T10:00:00.000Z",
          reviewedAt: null,
        },
      ],
    });
  });
});
