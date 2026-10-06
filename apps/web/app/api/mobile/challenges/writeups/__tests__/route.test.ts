import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  writeupBoardFor: vi.fn<(userId: string, challengeId: unknown) => Promise<unknown>>(),
  publishWriteup: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
  deleteWriteup: vi.fn<(userId: string, challengeId: unknown) => Promise<unknown>>(),
}));

vi.mock("../../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/challenges/writeups", () => ({
  writeupBoardFor: m.writeupBoardFor,
  publishWriteup: m.publishWriteup,
  deleteWriteup: m.deleteWriteup,
}));

const { DELETE, GET, POST } = await import("../route");

const ID = "11111111-1111-4111-8111-111111111111";
const URL_BASE = "https://cyberlearn.fr/api/mobile/challenges/writeups";

const send = (method: "POST" | "DELETE", body: unknown): NextRequest =>
  new NextRequest(URL_BASE, { method, body: JSON.stringify(body) });

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "u1", email: null });
});

describe("/api/mobile/challenges/writeups", () => {
  it("refuses a caller the gate turns away, on every method", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await GET(new NextRequest(`${URL_BASE}?challengeId=${ID}`))).status).toBe(401);
    expect((await POST(send("POST", { challengeId: ID, content: "x" }))).status).toBe(401);
    expect((await DELETE(send("DELETE", { challengeId: ID }))).status).toBe(401);
    expect(m.writeupBoardFor).not.toHaveBeenCalled();
    expect(m.publishWriteup).not.toHaveBeenCalled();
    expect(m.deleteWriteup).not.toHaveBeenCalled();
  });

  it("gives the board the site shows, or not found", async () => {
    m.writeupBoardFor.mockResolvedValue({ solved: false, count: 2 });
    const res = await GET(new NextRequest(`${URL_BASE}?challengeId=${ID}`));
    expect(await res.json()).toEqual({ ok: true, board: { solved: false, count: 2 } });
    expect(m.writeupBoardFor).toHaveBeenCalledWith("u1", ID);
    m.writeupBoardFor.mockResolvedValue(null);
    expect((await GET(new NextRequest(URL_BASE))).status).toBe(404);
  });

  it("publishes through the service and says why it refused", async () => {
    m.publishWriteup.mockResolvedValue({ ok: true, heldForReview: true });
    const res = await POST(send("POST", { challengeId: ID, content: "Ma démarche." }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, heldForReview: true });
    expect(m.publishWriteup).toHaveBeenCalledWith("u1", {
      challengeId: ID,
      content: "Ma démarche.",
    });
    m.publishWriteup.mockResolvedValue({
      ok: false,
      error: "Résous le défi avant de publier ta solution.",
    });
    expect((await POST(send("POST", { challengeId: ID, content: "x" }))).status).toBe(400);
  });

  it("removes the caller's own solution, and wants a challenge id", async () => {
    m.deleteWriteup.mockResolvedValue({ ok: true });
    expect((await DELETE(send("DELETE", { challengeId: ID }))).status).toBe(200);
    expect(m.deleteWriteup).toHaveBeenCalledWith("u1", ID);
    expect((await DELETE(send("DELETE", { challengeId: "nope" }))).status).toBe(400);
    expect(m.deleteWriteup).toHaveBeenCalledTimes(1);
  });
});
