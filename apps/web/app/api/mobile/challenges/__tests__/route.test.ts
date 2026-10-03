import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  challengeItemsFor: vi.fn<(u: string) => Promise<unknown[]>>(),
  challengeDetailFor: vi.fn<(u: string, s: string) => Promise<unknown>>(),
  submitFlagFor: vi.fn<(u: string, c: string, f: string) => Promise<unknown>>(),
  revealHintFor: vi.fn<(u: string, h: string) => Promise<unknown>>(),
  completeFor: vi.fn<(u: string, c: string) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/challenges/catalogue", () => ({
  challengeItemsFor: m.challengeItemsFor,
  challengeDetailFor: m.challengeDetailFor,
}));
vi.mock("@/lib/challenges/play", () => ({
  submitFlagFor: m.submitFlagFor,
  revealHintFor: m.revealHintFor,
  completeFor: m.completeFor,
}));

const list = await import("../route");
const detail = await import("../detail/route");
const flag = await import("../flag/route");
const hint = await import("../hint/route");
const complete = await import("../complete/route");

const CHALLENGE = "11111111-1111-4111-8111-111111111111";
const HINT = "22222222-2222-4222-8222-222222222222";

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/challenges/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("the challenge routes", () => {
  it("turn away a caller the gate refuses, every one of them", async () => {
    m.userFromBearer.mockResolvedValue(null);
    const responses = await Promise.all([
      list.GET(new NextRequest("https://cyberlearn.fr/api/mobile/challenges")),
      detail.GET(new NextRequest("https://cyberlearn.fr/api/mobile/challenges/detail?slug=a")),
      flag.POST(post("flag", { challengeId: CHALLENGE, flag: "x" })),
      hint.POST(post("hint", { hintId: HINT })),
      complete.POST(post("complete", { challengeId: CHALLENGE })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    expect(m.submitFlagFor).not.toHaveBeenCalled();
  });

  it("list the caller's challenges", async () => {
    m.challengeItemsFor.mockResolvedValue([{ slug: "journal-bavard" }]);
    const res = await list.GET(new NextRequest("https://cyberlearn.fr/api/mobile/challenges"));
    expect(await res.json()).toEqual({ ok: true, items: [{ slug: "journal-bavard" }] });
    expect(m.challengeItemsFor).toHaveBeenCalledWith("user-1");
  });

  it("refuse a slug that is not one, and say when a challenge is not there", async () => {
    const bad = await detail.GET(
      new NextRequest("https://cyberlearn.fr/api/mobile/challenges/detail?slug=../x"),
    );
    expect(bad.status).toBe(400);
    m.challengeDetailFor.mockResolvedValue(null);
    const missing = await detail.GET(
      new NextRequest("https://cyberlearn.fr/api/mobile/challenges/detail?slug=absent"),
    );
    expect(missing.status).toBe(404);
  });

  it("check a flag for the caller, never for an id the body names", async () => {
    m.submitFlagFor.mockResolvedValue({ correct: true });
    const res = await flag.POST(
      post("flag", { challengeId: CHALLENGE, flag: "CL{x}", userId: "user-2" }),
    );
    expect(await res.json()).toEqual({ ok: true, correct: true });
    expect(m.submitFlagFor).toHaveBeenCalledWith("user-1", CHALLENGE, "CL{x}");
  });

  it("refuse a body they cannot read", async () => {
    const res = await flag.POST(post("flag", { challengeId: "nope", flag: "x" }));
    expect(res.status).toBe(400);
    const hintRes = await hint.POST(post("hint", {}));
    expect(hintRes.status).toBe(400);
  });

  it("reveal a hint and mark a puzzle done for the caller", async () => {
    m.revealHintFor.mockResolvedValue({ content: "Regarde les logs." });
    m.completeFor.mockResolvedValue({});
    expect(await (await hint.POST(post("hint", { hintId: HINT }))).json()).toEqual({
      ok: true,
      content: "Regarde les logs.",
    });
    expect(m.revealHintFor).toHaveBeenCalledWith("user-1", HINT);
    await complete.POST(post("complete", { challengeId: CHALLENGE }));
    expect(m.completeFor).toHaveBeenCalledWith("user-1", CHALLENGE);
  });
});
