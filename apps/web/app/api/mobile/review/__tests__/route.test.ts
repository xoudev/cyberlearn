import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userFromBearer =
  vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>();
const gradeReview =
  vi.fn<
    (
      userId: string,
      input: unknown,
    ) => Promise<{ ok: true; nextReviewAt: Date; reviewXp: number } | { ok: false }>
  >();

vi.mock("../../_lib/auth", () => ({ userFromBearer: (r: Request) => userFromBearer(r) }));
vi.mock("@/lib/revisions/grade-review", () => ({
  gradeReview: (u: string, i: unknown) => gradeReview(u, i),
}));

const { POST } = await import("../route");

const SCHEDULE = "11111111-1111-4111-8111-111111111111";

function request(body: string): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/review", { method: "POST", body });
}

beforeEach(() => {
  userFromBearer.mockReset();
  gradeReview.mockReset();
});

describe("POST /api/mobile/review", () => {
  it("refuses a caller with no valid token, and grades nothing", async () => {
    userFromBearer.mockResolvedValue(null);
    expect((await POST(request("{}"))).status).toBe(401);
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    expect((await POST(request("pas du json"))).status).toBe(400);
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("grades as the token's user and answers the XP and the next date", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    gradeReview.mockResolvedValue({
      ok: true,
      nextReviewAt: new Date("2026-09-30T08:00:00Z"),
      reviewXp: 5,
    });
    const body = { scheduleId: SCHEDULE, quality: 5, userId: "someone-else" };
    const res = await POST(request(JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      nextReviewAt: "2026-09-30T08:00:00.000Z",
      reviewXp: 5,
    });
    expect(gradeReview).toHaveBeenCalledWith("user-1", body);
  });

  it("says so when the review was not gradable (not due, not theirs, graded twice)", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    gradeReview.mockResolvedValue({ ok: false });
    const res = await POST(request(JSON.stringify({ scheduleId: SCHEDULE, quality: 3 })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Cette révision n'est plus à faire." });
  });
});
