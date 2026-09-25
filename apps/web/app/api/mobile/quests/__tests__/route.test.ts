import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  claimQuestFor: vi.fn<(u: string, questId: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/quests/claim", () => ({ claimQuestFor: m.claimQuestFor }));

const { POST } = await import("../claim/route");

function claim(body: string): NextRequest {
  return new NextRequest("https://cyberlearn.fr/api/mobile/quests/claim", {
    method: "POST",
    body,
  });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("POST /api/mobile/quests/claim", () => {
  it("refuses a caller the gate turns away, and credits nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await POST(claim('{"questId":"q"}'))).status).toBe(401);
    expect(m.claimQuestFor).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    expect((await POST(claim("nope"))).status).toBe(400);
    expect(m.claimQuestFor).not.toHaveBeenCalled();
  });

  it("claims as the caller, the quest named in the body", async () => {
    m.claimQuestFor.mockResolvedValue({ ok: true, xpGained: 50, leveledUp: false, newLevel: 3 });
    const res = await POST(claim('{"questId":"q-1"}'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, xpGained: 50, leveledUp: false, newLevel: 3 });
    expect(m.claimQuestFor).toHaveBeenCalledWith("user-1", "q-1");
  });

  it("passes the service's refusal on, and a body without an id as none", async () => {
    m.claimQuestFor.mockResolvedValue({ ok: false, error: "Récompense déjà réclamée." });
    const res = await POST(claim("{}"));
    expect(res.status).toBe(409);
    expect(m.claimQuestFor).toHaveBeenCalledWith("user-1", null);
  });
});
