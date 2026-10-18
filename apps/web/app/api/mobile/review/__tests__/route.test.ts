import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userFromBearer =
  vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>();

vi.mock("../../_lib/auth", () => ({ userFromBearer: (r: Request) => userFromBearer(r) }));

const { POST } = await import("../route");

const SCHEDULE = "11111111-1111-4111-8111-111111111111";

function request(body: string): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/review", { method: "POST", body });
}

/**
 * What the app builds from before the review cards make of the reply
 * (GradeReviewReply in their lib/api.ts): `ok`, then either the XP and the
 * next date, or an error string they show under the review.
 */
function readsAsRefusal(reply: unknown): boolean {
  if (typeof reply !== "object" || reply === null) return false;
  return "ok" in reply && reply.ok === false && "error" in reply && typeof reply.error === "string";
}

beforeEach(() => {
  userFromBearer.mockReset();
});

describe("POST /api/mobile/review, the retired SM-2 queue", () => {
  it("refuses a caller with no valid token", async () => {
    userFromBearer.mockResolvedValue(null);
    const res = await POST(request("{}"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "Non authentifié." });
  });

  it("grades nothing, and says so in the shape the installed apps read", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    const res = await POST(request(JSON.stringify({ scheduleId: SCHEDULE, quality: 5 })));
    expect(res.status).toBe(409);
    const reply: unknown = await res.json();
    expect(readsAsRefusal(reply)).toBe(true);
    expect(reply).toEqual({
      ok: false,
      error:
        "Cette révision n'est plus à faire : mets l'app à jour pour retrouver ton rappel du jour.",
    });
  });

  it("answers the same to a body it never reads, JSON or not", async () => {
    userFromBearer.mockResolvedValue({ id: "user-1", email: null });
    for (const body of ["pas du json", "{}", JSON.stringify({ scheduleId: "x", quality: 1 })]) {
      const res = await POST(request(body));
      expect(res.status).toBe(409);
      expect(readsAsRefusal(await res.json())).toBe(true);
    }
  });
});
