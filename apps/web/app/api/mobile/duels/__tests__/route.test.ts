import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  listDuelsFor: vi.fn<(userId: string) => Promise<unknown[]>>(),
  duelSetupFor: vi.fn<(userId: string) => Promise<unknown>>(),
  createDuel: vi.fn<(userId: string, input: unknown) => Promise<{ ok: boolean }>>(),
  duelViewFor: vi.fn<(userId: string, id: unknown) => Promise<unknown>>(),
  respondToDuel:
    vi.fn<(userId: string, id: unknown, accept: unknown) => Promise<{ ok: boolean }>>(),
  answerDuel: vi.fn<(userId: string, input: unknown) => Promise<{ ok: boolean }>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("../../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/social/duels", () => ({
  listDuelsFor: m.listDuelsFor,
  duelSetupFor: m.duelSetupFor,
  createDuel: m.createDuel,
  duelViewFor: m.duelViewFor,
  respondToDuel: m.respondToDuel,
  answerDuel: m.answerDuel,
}));

const list = await import("../route");
const play = await import("../play/route");

const BASE = "https://cyberlearn.fr/api/mobile/duels";
const post = (url: string, body: unknown): NextRequest =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "u1", email: null });
});

describe("/api/mobile/duels", () => {
  it("refuses a caller the gate turns away, everywhere", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await list.GET(new NextRequest(BASE))).status).toBe(401);
    expect((await list.POST(post(BASE, {}))).status).toBe(401);
    expect((await play.GET(new NextRequest(`${BASE}/play?id=d`))).status).toBe(401);
    expect((await play.POST(post(`${BASE}/play`, { action: "answer" }))).status).toBe(401);
    expect(m.createDuel).not.toHaveBeenCalled();
    expect(m.answerDuel).not.toHaveBeenCalled();
  });

  it("lists the duels with what the form needs, and creates one", async () => {
    m.listDuelsFor.mockResolvedValue([{ id: "d1" }]);
    m.duelSetupFor.mockResolvedValue({ friends: [{ id: "f", name: "Alex" }], paths: [] });
    expect(await (await list.GET(new NextRequest(BASE))).json()).toEqual({
      ok: true,
      duels: [{ id: "d1" }],
      friends: [{ id: "f", name: "Alex" }],
      paths: [],
    });
    m.createDuel.mockResolvedValue({ ok: true });
    expect((await list.POST(post(BASE, { opponentId: "f", pathId: "p" }))).status).toBe(200);
    expect(m.createDuel).toHaveBeenCalledWith("u1", { opponentId: "f", pathId: "p" });
  });

  it("reads a duel, answers an invitation and a question, and refuses anything else", async () => {
    m.duelViewFor.mockResolvedValue(null);
    expect((await play.GET(new NextRequest(`${BASE}/play?id=d`))).status).toBe(404);
    m.respondToDuel.mockResolvedValue({ ok: true });
    await play.POST(post(`${BASE}/play`, { action: "respond", id: "d", accept: true }));
    expect(m.respondToDuel).toHaveBeenCalledWith("u1", "d", true);
    m.answerDuel.mockResolvedValue({ ok: false });
    const res = await play.POST(
      post(`${BASE}/play`, { action: "answer", duelId: "d", index: 0, selected: 1 }),
    );
    expect(res.status).toBe(400);
    expect(m.answerDuel).toHaveBeenCalledWith("u1", { duelId: "d", index: 0, selected: 1 });
    expect((await play.POST(post(`${BASE}/play`, { action: "nope" }))).status).toBe(400);
  });
});
