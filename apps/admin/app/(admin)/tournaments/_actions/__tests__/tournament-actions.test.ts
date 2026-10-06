import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string; email: undefined; role: "ADMIN" }>>(),
  classCount: vi.fn<(args: unknown) => Promise<number>>(),
  challengeFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  auditCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>(),
  create: vi.fn<(input: Record<string, unknown>) => Promise<{ id: string }>>(),
  update: vi.fn<(id: string, input: Record<string, unknown>) => Promise<void>>(),
  findForConsole: vi.fn<(id: string) => Promise<unknown>>(),
  deleteUpcoming: vi.fn<(id: string, now: Date) => Promise<boolean>>(),
  endNow: vi.fn<(id: string, now: Date) => Promise<boolean>>(),
  announceTournament: vi.fn<(tournament: unknown, classIds: string[]) => Promise<void>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  redirect: vi.fn<(url: string) => never>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  LIVE_CLASS_FILTER: { archivedAt: null },
  prisma: {
    class: { count: m.classCount },
    challenge: { findMany: m.challengeFindMany },
    auditLog: { create: m.auditCreate },
  },
  tournamentRepository: {
    create: m.create,
    update: m.update,
    findForConsole: m.findForConsole,
    deleteUpcoming: m.deleteUpcoming,
    endNow: m.endNow,
  },
}));
vi.mock("@/lib/tournament-notice", () => ({ announceTournament: m.announceTournament }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

const {
  createTournamentAction,
  deleteTournamentAction,
  endTournamentNowAction,
  updateTournamentAction,
} = await import("../tournament-actions");

/**
 * Composing a tournament in the console: what it refuses, what it saves (in
 * Paris time), who is told, and what can still change once it has started.
 */

const T = "55555555-5555-4555-8555-555555555555";
const CLASS_A = "66666666-6666-4666-8666-666666666666";
const CLASS_B = "77777777-7777-4777-8777-777777777777";
const C1 = "88888888-8888-4888-8888-888888888888";

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

const VALID = {
  title: "CTF de la Toussaint",
  description: "Deux heures.",
  // Paris time, summer time still on 16 October: 12:00 and 14:00 UTC.
  startsAt: "2026-10-16T14:00",
  endsAt: "2026-10-16T16:00",
  teamScope: "CLASS",
  classIds: [CLASS_A, CLASS_B],
  challengeIds: [C1],
  [`points:${C1}`]: "200",
};

function existing(startsAt: string, endsAt: string): Record<string, unknown> {
  return {
    id: T,
    title: "CTF",
    description: "",
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    teamScope: "CLASS",
    classes: [{ classId: CLASS_A }],
    challenges: [{ challengeId: C1, points: 100 }],
    _count: { solves: 0 },
  };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T08:00:00Z"));
  m.requireAdminAction.mockResolvedValue({ id: "admin-1", email: undefined, role: "ADMIN" });
  m.classCount.mockResolvedValue(2);
  m.challengeFindMany.mockResolvedValue([
    { title: "Le journal", type: "CTF", flag: "CL{x}", machine: null },
  ]);
  m.create.mockResolvedValue({ id: T });
  m.redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createTournamentAction", () => {
  it("saves the window in Paris time, tells the classes, and opens the tournament", async () => {
    await expect(createTournamentAction({}, form(VALID))).rejects.toThrow(
      `NEXT_REDIRECT:/tournaments/${T}`,
    );
    expect(m.create).toHaveBeenCalledWith({
      title: "CTF de la Toussaint",
      description: "Deux heures.",
      startsAt: new Date("2026-10-16T12:00:00Z"),
      endsAt: new Date("2026-10-16T14:00:00Z"),
      teamScope: "CLASS",
      createdById: "admin-1",
      classIds: [CLASS_A, CLASS_B],
      challenges: [{ challengeId: C1, points: 200 }],
    });
    expect(m.auditCreate.mock.calls[0]?.[0].data).toMatchObject({
      actorId: "admin-1",
      action: "tournament.create",
      targetType: "Tournament",
      targetId: T,
    });
    expect(m.announceTournament).toHaveBeenCalledWith(
      expect.objectContaining({ id: T, title: "CTF de la Toussaint" }),
      [CLASS_A, CLASS_B],
    );
  });

  it("refuses a tournament without classes, without challenges, or with a challenge out of bounds", async () => {
    expect(await createTournamentAction({}, form({ ...VALID, classIds: [] }))).toEqual({
      error: "Choisis au moins une classe.",
    });
    expect(await createTournamentAction({}, form({ ...VALID, challengeIds: [] }))).toEqual({
      error: "Choisis au moins un défi.",
    });
    expect(await createTournamentAction({}, form({ ...VALID, [`points:${C1}`]: "5" }))).toEqual({
      error: "Un défi vaut au moins 10 points.",
    });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("refuses dates that do not read, a window too short, or one already over", async () => {
    expect(await createTournamentAction({}, form({ ...VALID, startsAt: "demain" }))).toEqual({
      error: "Une des dates ne se lit pas.",
    });
    expect(
      await createTournamentAction({}, form({ ...VALID, endsAt: "2026-10-16T14:05" })),
    ).toEqual({ error: "Un tournoi dure au moins 15 minutes." });
    expect(
      await createTournamentAction(
        {},
        form({ ...VALID, startsAt: "2026-10-01T14:00", endsAt: "2026-10-01T16:00" }),
      ),
    ).toEqual({ error: "Ce tournoi serait déjà terminé." });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("refuses a challenge that takes no flag, and a class that is gone", async () => {
    m.challengeFindMany.mockResolvedValueOnce([
      { title: "Le puzzle", type: "PUZZLE", flag: null, machine: null },
    ]);
    expect(await createTournamentAction({}, form(VALID))).toEqual({
      error: "« Le puzzle » ne se valide pas par un flag : il ne peut pas servir ici.",
    });
    m.challengeFindMany.mockResolvedValueOnce([
      { title: "Le vide", type: "CTF", flag: null, machine: null },
    ]);
    expect(await createTournamentAction({}, form(VALID))).toEqual({
      error: "« Le vide » n'a pas de flag.",
    });
    m.classCount.mockResolvedValueOnce(1);
    expect(await createTournamentAction({}, form(VALID))).toEqual({
      error: "Une des classes n'existe plus, ou a été archivée.",
    });
    expect(m.create).not.toHaveBeenCalled();
  });
});

describe("updateTournamentAction", () => {
  it("rewrites everything before the start, and tells only the class added", async () => {
    m.findForConsole.mockResolvedValue(existing("2026-10-16T12:00:00Z", "2026-10-16T14:00:00Z"));
    expect(await updateTournamentAction(T, {}, form(VALID))).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledWith(
      T,
      expect.objectContaining({
        classIds: [CLASS_A, CLASS_B],
        challenges: [{ challengeId: C1, points: 200 }],
        teamScope: "CLASS",
      }),
    );
    expect(m.announceTournament).toHaveBeenCalledWith(expect.anything(), [CLASS_B]);
  });

  it("moves only the end, the title and the description once it runs", async () => {
    vi.setSystemTime(new Date("2026-10-16T13:00:00Z"));
    m.findForConsole.mockResolvedValue(existing("2026-10-16T12:00:00Z", "2026-10-16T14:00:00Z"));
    const running = form({ title: "CTF prolongé", description: "", endsAt: "2026-10-16T17:00" });
    expect(await updateTournamentAction(T, {}, running)).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledWith(T, {
      title: "CTF prolongé",
      description: "",
      startsAt: new Date("2026-10-16T12:00:00Z"),
      endsAt: new Date("2026-10-16T15:00:00Z"),
    });
    expect(m.announceTournament).not.toHaveBeenCalled();
    const past = form({ title: "CTF", description: "", endsAt: "2026-10-16T14:30" });
    expect(await updateTournamentAction(T, {}, past)).toEqual({
      error: "Pour l'arrêter maintenant, utilise « Terminer maintenant ».",
    });
  });

  it("keeps the window of a finished tournament", async () => {
    vi.setSystemTime(new Date("2026-10-20T13:00:00Z"));
    m.findForConsole.mockResolvedValue(existing("2026-10-16T12:00:00Z", "2026-10-16T14:00:00Z"));
    const finished = form({ title: "CTF de la Toussaint 2026", description: "Bravo." });
    expect(await updateTournamentAction(T, {}, finished)).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalledWith(T, {
      title: "CTF de la Toussaint 2026",
      description: "Bravo.",
      startsAt: new Date("2026-10-16T12:00:00Z"),
      endsAt: new Date("2026-10-16T14:00:00Z"),
    });
  });
});

describe("deleting and ending", () => {
  it("deletes a tournament only before it starts", async () => {
    m.deleteUpcoming.mockResolvedValueOnce(false);
    expect(await deleteTournamentAction(T)).toEqual({
      error: "Un tournoi commencé ne se supprime pas : ses scores restent. Arrête-le.",
    });
    m.deleteUpcoming.mockResolvedValueOnce(true);
    await expect(deleteTournamentAction(T)).rejects.toThrow("NEXT_REDIRECT:/tournaments");
    expect(m.auditCreate.mock.calls[0]?.[0].data).toMatchObject({ action: "tournament.delete" });
  });

  it("ends a running tournament, and says when there is none to end", async () => {
    m.endNow.mockResolvedValueOnce(true);
    expect(await endTournamentNowAction(T)).toEqual({ ok: true });
    m.endNow.mockResolvedValueOnce(false);
    expect(await endTournamentNowAction(T)).toEqual({ error: "Ce tournoi n'est pas en cours." });
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(createTournamentAction({}, form(VALID))).rejects.toThrow("NEXT_REDIRECT:/login");
    await expect(endTournamentNowAction(T)).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(m.create).not.toHaveBeenCalled();
    expect(m.endNow).not.toHaveBeenCalled();
  });
});
