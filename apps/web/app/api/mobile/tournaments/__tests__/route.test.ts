import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  listTournamentsFor: vi.fn<(userId: string) => Promise<unknown[]>>(),
  tournamentViewFor: vi.fn<(userId: string, id: unknown) => Promise<unknown>>(),
  tournamentChallengeFor:
    vi.fn<
      (userId: string, id: unknown, slug: unknown) => Promise<Record<string, unknown> | null>
    >(),
  submitTournamentFlag: vi.fn<(userId: string, input: unknown) => Promise<{ ok: boolean }>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("../../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/tournaments/tournaments", () => ({
  listTournamentsFor: m.listTournamentsFor,
  tournamentViewFor: m.tournamentViewFor,
  tournamentChallengeFor: m.tournamentChallengeFor,
  submitTournamentFlag: m.submitTournamentFlag,
}));

const list = await import("../route");
const play = await import("../play/route");

const BASE = "https://cyberlearn.fr/api/mobile/tournaments";
const post = (url: string, body: unknown): NextRequest =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body) });

/** The app's way to the tournaments: behind the bearer gate, through the site's service. */

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "u1", email: null });
});

describe("/api/mobile/tournaments", () => {
  it("refuses a caller the gate turns away, everywhere", async () => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await list.GET(new NextRequest(BASE))).status).toBe(401);
    expect((await play.GET(new NextRequest(`${BASE}/play?id=t`))).status).toBe(401);
    expect((await play.POST(post(`${BASE}/play`, { flag: "x" }))).status).toBe(401);
    expect(m.submitTournamentFlag).not.toHaveBeenCalled();
  });

  it("lists the reader's tournaments, with the server's clock", async () => {
    m.listTournamentsFor.mockResolvedValue([{ id: "t1" }]);
    // SAFETY: the route's own JSON, read back in the shape it was written.
    const body = (await (await list.GET(new NextRequest(BASE))).json()) as {
      ok: boolean;
      tournaments: unknown[];
      serverNow: string;
    };
    expect(body.ok).toBe(true);
    expect(body.tournaments).toEqual([{ id: "t1" }]);
    expect(Number.isNaN(Date.parse(body.serverNow))).toBe(false);
    expect(m.listTournamentsFor).toHaveBeenCalledWith("u1");
  });

  it("sends a tournament, or says it is not the reader's", async () => {
    m.tournamentViewFor.mockResolvedValueOnce({ id: "t1", phase: "RUNNING" });
    const found = await play.GET(new NextRequest(`${BASE}/play?id=t1`));
    expect(await found.json()).toEqual({ ok: true, tournament: { id: "t1", phase: "RUNNING" } });
    expect(m.tournamentViewFor).toHaveBeenCalledWith("u1", "t1");
    m.tournamentViewFor.mockResolvedValueOnce(null);
    expect((await play.GET(new NextRequest(`${BASE}/play?id=t2`))).status).toBe(404);
  });

  it("sends a challenge without its machine, which only the site runs", async () => {
    m.tournamentChallengeFor.mockResolvedValue({
      tournament: { id: "t1" },
      challenge: { id: "c1", onMachine: true },
      solved: false,
      machine: { files: [{ path: "/flag", content: "CL{...}" }] },
    });
    const res = await play.GET(new NextRequest(`${BASE}/play?id=t1&slug=journal`));
    expect(await res.json()).toEqual({
      ok: true,
      challenge: {
        tournament: { id: "t1" },
        challenge: { id: "c1", onMachine: true },
        solved: false,
      },
    });
    expect(m.tournamentChallengeFor).toHaveBeenCalledWith("u1", "t1", "journal");
  });

  it("hands a flag to the service, and a refusal back as a 400", async () => {
    m.submitTournamentFlag.mockResolvedValueOnce({ ok: true });
    const body = { tournamentId: "t1", challengeId: "c1", flag: "CL{x}" };
    expect((await play.POST(post(`${BASE}/play`, body))).status).toBe(200);
    expect(m.submitTournamentFlag).toHaveBeenCalledWith("u1", body);
    m.submitTournamentFlag.mockResolvedValueOnce({ ok: false });
    expect((await play.POST(post(`${BASE}/play`, body))).status).toBe(400);
  });
});
