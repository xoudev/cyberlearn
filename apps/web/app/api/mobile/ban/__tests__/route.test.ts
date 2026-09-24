import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const identityFromBearer =
  vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>();
const acknowledgeBan = vi.fn<(userId: string) => Promise<{ ok: boolean }>>();
const appealBan =
  vi.fn<
    (input: {
      userId: string;
      fallbackEmail: string | null;
      message: unknown;
      ip: string;
    }) => Promise<{ ok?: boolean; error?: string }>
  >();

vi.mock("../../_lib/auth", () => ({
  identityFromBearer: (r: Request) => identityFromBearer(r),
  // Never the gate here: a banned account has to reach these two routes.
  userFromBearer: () => {
    throw new Error("the ban routes must not use userFromBearer");
  },
}));
vi.mock("@/lib/moderation/ban-appeal", () => ({
  acknowledgeBan: (u: string) => acknowledgeBan(u),
  appealBan: (i: Parameters<typeof appealBan>[0]) => appealBan(i),
}));

const { POST: ACKNOWLEDGE } = await import("../acknowledge/route");
const { POST: APPEAL } = await import("../appeal/route");

function post(path: string, body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/ban${path}`, {
    method: "POST",
    body,
    headers,
  });
}

beforeEach(() => {
  identityFromBearer.mockReset();
  acknowledgeBan.mockReset();
  appealBan.mockReset();
});

describe("POST /api/mobile/ban/acknowledge", () => {
  it("refuses a caller with no valid token", async () => {
    identityFromBearer.mockResolvedValue(null);
    expect((await ACKNOWLEDGE(post("/acknowledge", "{}"))).status).toBe(401);
    expect(acknowledgeBan).not.toHaveBeenCalled();
  });

  it("records the notice for the token's user", async () => {
    identityFromBearer.mockResolvedValue({ id: "user-1", email: null });
    acknowledgeBan.mockResolvedValue({ ok: true });
    expect((await ACKNOWLEDGE(post("/acknowledge", "{}"))).status).toBe(200);
    expect(acknowledgeBan).toHaveBeenCalledWith("user-1");
  });

  it("says so when there was no ban to acknowledge", async () => {
    identityFromBearer.mockResolvedValue({ id: "user-1", email: null });
    acknowledgeBan.mockResolvedValue({ ok: false });
    expect((await ACKNOWLEDGE(post("/acknowledge", "{}"))).status).toBe(409);
  });
});

describe("POST /api/mobile/ban/appeal", () => {
  it("refuses a caller with no valid token", async () => {
    identityFromBearer.mockResolvedValue(null);
    expect((await APPEAL(post("/appeal", "{}"))).status).toBe(401);
    expect(appealBan).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    identityFromBearer.mockResolvedValue({ id: "user-1", email: null });
    expect((await APPEAL(post("/appeal", "pas du json"))).status).toBe(400);
    expect(appealBan).not.toHaveBeenCalled();
  });

  it("appeals as the token's user, with the caller's address for the rate limit", async () => {
    identityFromBearer.mockResolvedValue({ id: "user-1", email: "a@example.org" });
    appealBan.mockResolvedValue({ ok: true });
    const res = await APPEAL(
      post("/appeal", JSON.stringify({ message: "Mon message", userId: "someone-else" }), {
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      }),
    );
    expect(res.status).toBe(200);
    expect(appealBan).toHaveBeenCalledWith({
      userId: "user-1",
      fallbackEmail: "a@example.org",
      message: "Mon message",
      ip: "203.0.113.7",
    });
  });

  it("passes a refusal on with its message", async () => {
    identityFromBearer.mockResolvedValue({ id: "user-1", email: null });
    appealBan.mockResolvedValue({ error: "Un appel est déjà ouvert pour cette décision." });
    const res = await APPEAL(post("/appeal", JSON.stringify({ message: "Mon message" })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Un appel est déjà ouvert pour cette décision.",
    });
  });
});
