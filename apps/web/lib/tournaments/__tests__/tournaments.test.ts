import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findById: vi.fn<(id: string) => Promise<unknown>>(),
  accessOf: vi.fn<(tournamentId: string, userId: string) => Promise<unknown>>(),
  listSolves: vi.fn<(tournamentId: string) => Promise<unknown[]>>(),
  listVisibleTo: vi.fn<(userId: string, isAdmin: boolean) => Promise<unknown[]>>(),
  findChallenge: vi.fn<(tournamentId: string, slug: string) => Promise<unknown>>(),
  findChallengeForFlag: vi.fn<(tournamentId: string, challengeId: string) => Promise<unknown>>(),
  findOwnSolve:
    vi.fn<
      (
        tournamentId: string,
        challengeId: string,
        userId: string,
      ) => Promise<{ disqualifiedAt: Date | null; disqualifiedReason: string | null } | null>
    >(),
  recordSolve: vi.fn<(input: Record<string, unknown>) => Promise<boolean>>(),
  findRoleById: vi.fn<(userId: string) => Promise<{ role: string } | null>>(),
  findForMember: vi.fn<(userId: string) => Promise<unknown[]>>(),
  teachesAnyClass: vi.fn<(userId: string) => Promise<boolean>>(),
  friendIds: vi.fn<(userId: string) => Promise<Set<string>>>(),
  checkFlagSubmission: vi.fn<(userId: string) => Promise<{ success: boolean }>>(),
  expectedFlag:
    vi.fn<
      (
        challenge: unknown,
        userId: string,
      ) => { ok: true; flag: string } | { ok: false; error: string }
    >(),
}));

vi.mock("@cyberlearn/db", () => ({
  LeaderboardVisibility: { HIDDEN: "HIDDEN", ANONYMOUS: "ANONYMOUS", PUBLIC: "PUBLIC" },
  tournamentRepository: {
    findById: m.findById,
    accessOf: m.accessOf,
    listSolves: m.listSolves,
    listVisibleTo: m.listVisibleTo,
    findChallenge: m.findChallenge,
    findChallengeForFlag: m.findChallengeForFlag,
    findOwnSolve: m.findOwnSolve,
    recordSolve: m.recordSolve,
  },
  userRepository: { findRoleById: m.findRoleById },
  classRepository: { findForMember: m.findForMember, teachesAnyClass: m.teachesAnyClass },
  friendshipRepository: { friendIds: m.friendIds },
}));
vi.mock("@/lib/challenges/play", () => ({ expectedFlag: m.expectedFlag }));
vi.mock("@/lib/rate-limit", () => ({ checkFlagSubmission: m.checkFlagSubmission }));

const {
  listTournamentsFor,
  submitTournamentFlag,
  tournamentChallengeFor,
  tournamentListFor,
  tournamentViewFor,
} = await import("../tournaments");

/**
 * A tournament as its players meet it: hidden challenges before the start,
 * teams and players ranked during, names as each player chose them, a flag
 * checked and counted once, nothing played by someone outside its classes.
 */

const ME = "11111111-1111-4111-8111-111111111111";
const MATE = "22222222-2222-4222-8222-222222222222";
const RIVAL = "33333333-3333-4333-8333-333333333333";
const SHY = "44444444-4444-4444-8444-444444444444";
const T = "55555555-5555-4555-8555-555555555555";
const CLASS_A = "66666666-6666-4666-8666-666666666666";
const CLASS_B = "77777777-7777-4777-8777-777777777777";
const C1 = "88888888-8888-4888-8888-888888888888";
const C2 = "99999999-9999-4999-8999-999999999999";

const BEFORE = new Date("2026-10-16T11:00:00Z");
const DURING = new Date("2026-10-16T13:00:00Z");
const AFTER = new Date("2026-10-16T15:00:00Z");

function tournamentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: T,
    title: "CTF de la Toussaint",
    description: "Deux heures, cinq défis.",
    startsAt: new Date("2026-10-16T12:00:00Z"),
    endsAt: new Date("2026-10-16T14:00:00Z"),
    teamScope: "CLASS",
    classes: [
      {
        class: {
          id: CLASS_A,
          name: "SIO1-A",
          promotion: { name: "BTS", establishment: { id: "s1", name: "Lycée Jean Moulin" } },
        },
      },
      {
        class: {
          id: CLASS_B,
          name: "SIO1-B",
          promotion: { name: "BTS", establishment: { id: "s2", name: "Lycée Victor Hugo" } },
        },
      },
    ],
    challenges: [
      {
        points: 100,
        challenge: {
          id: C1,
          slug: "journal",
          title: "Le journal",
          category: "CYBERSEC",
          difficulty: "BEGINNER",
          type: "CTF",
        },
      },
      {
        points: 300,
        challenge: {
          id: C2,
          slug: "chiffre",
          title: "Le chiffre",
          category: "CYBERSEC",
          difficulty: "ADVANCED",
          type: "CTF",
        },
      },
    ],
    ...overrides,
  };
}

function solve(
  challengeId: string,
  userId: string,
  classId: string,
  points: number,
  iso: string,
  visibility: "PUBLIC" | "ANONYMOUS" | "HIDDEN",
): Record<string, unknown> {
  return {
    challengeId,
    userId,
    classId,
    points,
    solvedAt: new Date(iso),
    user: {
      displayName: `Joueur ${userId.slice(0, 1)}`,
      username: null,
      preferences: { leaderboardVisibility: visibility, publicProfile: true },
    },
  };
}

const SOLVES = [
  solve(C1, RIVAL, CLASS_B, 100, "2026-10-16T12:10:00Z", "ANONYMOUS"),
  solve(C1, ME, CLASS_A, 100, "2026-10-16T12:20:00Z", "ANONYMOUS"),
  solve(C1, MATE, CLASS_A, 100, "2026-10-16T12:25:00Z", "PUBLIC"),
  solve(C2, SHY, CLASS_B, 300, "2026-10-16T12:40:00Z", "HIDDEN"),
];

function player(classId: string): Record<string, unknown> {
  return {
    isMember: true,
    liveMemberships: [{ classId, joinedAt: new Date("2025-09-01T00:00:00Z") }],
    teaches: false,
  };
}

const NOBODY = { isMember: false, liveMemberships: [], teaches: false };

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.findById.mockResolvedValue(tournamentRow());
  m.accessOf.mockResolvedValue(player(CLASS_A));
  m.findRoleById.mockResolvedValue({ role: "STUDENT" });
  m.listSolves.mockResolvedValue(SOLVES);
  m.friendIds.mockResolvedValue(new Set());
  m.checkFlagSubmission.mockResolvedValue({ success: true });
  m.expectedFlag.mockReturnValue({ ok: true, flag: "CL{bon-flag}" });
  m.findOwnSolve.mockResolvedValue(null);
  m.recordSolve.mockResolvedValue(true);
  m.findChallengeForFlag.mockResolvedValue({
    points: 300,
    challenge: { id: C2, type: "CTF", flag: "CL{bon-flag}", machine: null },
  });
});

describe("tournamentViewFor", () => {
  it("is not found for someone in none of its classes", async () => {
    m.accessOf.mockResolvedValue(NOBODY);
    expect(await tournamentViewFor(ME, T, DURING)).toBeNull();
    expect(await tournamentViewFor(ME, "pas-un-id", DURING)).toBeNull();
  });

  it("hides the challenges before the start, and lists the teams at zero", async () => {
    const view = await tournamentViewFor(ME, T, BEFORE);
    expect(view?.phase).toBe("UPCOMING");
    expect(view?.challenges).toEqual([]);
    expect(view?.challengeCount).toBe(2);
    expect(view?.players).toEqual([]);
    expect(view?.teams.map((t) => [t.name, t.points])).toEqual([
      ["SIO1-A", 0],
      ["SIO1-B", 0],
    ]);
    expect(view?.canPlay).toBe(false);
    expect(m.listSolves).not.toHaveBeenCalled();
  });

  it("ranks the teams, a challenge counting once for each", async () => {
    const view = await tournamentViewFor(ME, T, DURING);
    expect(view?.canPlay).toBe(true);
    expect(view?.myTeam).toBe("SIO1-A");
    expect(view?.teams).toEqual([
      {
        rank: 1,
        name: "SIO1-B",
        detail: "Lycée Victor Hugo",
        points: 400,
        solved: 2,
        isMine: false,
      },
      {
        rank: 2,
        name: "SIO1-A",
        detail: "Lycée Jean Moulin",
        points: 100,
        solved: 1,
        isMine: true,
      },
    ]);
  });

  it("names the players as they chose, the reader always, the hidden not at all", async () => {
    const view = await tournamentViewFor(ME, T, DURING);
    expect(view?.players.map((p) => [p.rank, p.name, p.team, p.isMe])).toEqual([
      [1, "Anonyme", "SIO1-B", false],
      [2, "Joueur 1", "SIO1-A", true],
      [3, "Joueur 2", "SIO1-A", false],
    ]);
    expect(view?.me).toEqual({ points: 100, solved: 1, rank: 2 });
  });

  it("marks a friend named on the board, never an anonymous one", async () => {
    // RIVAL plays anonymously, MATE under their name: both are friends.
    m.friendIds.mockResolvedValue(new Set([RIVAL, MATE, SHY]));
    const view = await tournamentViewFor(ME, T, DURING);
    expect(view?.players.map((p) => [p.name, p.isFriend])).toEqual([
      ["Anonyme", false],
      ["Joueur 1", false],
      ["Joueur 2", true],
    ]);
    expect(m.friendIds).toHaveBeenCalledWith(ME);
  });

  it("reads no friends before the start, when there is nobody to mark", async () => {
    await tournamentViewFor(ME, T, BEFORE);
    expect(m.friendIds).not.toHaveBeenCalled();
  });

  it("says which challenges the reader and their team found, and who found each first", async () => {
    const view = await tournamentViewFor(ME, T, DURING);
    expect(
      view?.challenges.map((c) => [
        c.slug,
        c.solvedByMe,
        c.solvedByMyTeam,
        c.solveCount,
        c.firstTeam,
      ]),
    ).toEqual([
      ["journal", true, true, 3, "SIO1-B"],
      ["chiffre", false, false, 1, "SIO1-B"],
    ]);
  });

  it("lets a teacher of a class follow the scores without playing", async () => {
    m.accessOf.mockResolvedValue({ ...NOBODY, teaches: true });
    const view = await tournamentViewFor(ME, T, DURING);
    expect(view?.role).toBe("teacher");
    expect(view?.canPlay).toBe(false);
    expect(view?.me).toBeNull();
    expect(view?.myTeam).toBeNull();
  });

  it("opens to an admin, who plays for no team", async () => {
    m.accessOf.mockResolvedValue(NOBODY);
    m.findRoleById.mockResolvedValue({ role: "ADMIN" });
    const view = await tournamentViewFor(ME, T, DURING);
    expect(view?.role).toBe("admin");
    expect(view?.canPlay).toBe(false);
  });

  it("ranks the schools, school against school", async () => {
    m.findById.mockResolvedValue(tournamentRow({ teamScope: "ESTABLISHMENT" }));
    const view = await tournamentViewFor(ME, T, DURING);
    expect(view?.teams.map((t) => [t.name, t.detail, t.points, t.isMine])).toEqual([
      ["Lycée Victor Hugo", "SIO1-B", 400, false],
      ["Lycée Jean Moulin", "SIO1-A", 100, true],
    ]);
    expect(view?.myTeam).toBe("Lycée Jean Moulin");
  });
});

describe("submitTournamentFlag", () => {
  const input = { tournamentId: T, challengeId: C2, flag: "CL{bon-flag}" };

  it("counts a right flag once, for the player's class, at the challenge's points", async () => {
    expect(await submitTournamentFlag(ME, input, DURING)).toEqual({
      ok: true,
      correct: true,
      points: 300,
      already: false,
    });
    expect(m.recordSolve).toHaveBeenCalledWith({
      tournamentId: T,
      challengeId: C2,
      userId: ME,
      classId: CLASS_A,
      points: 300,
      solvedAt: DURING,
    });
  });

  it("records nothing for a wrong flag", async () => {
    expect(await submitTournamentFlag(ME, { ...input, flag: "CL{autre}" }, DURING)).toEqual({
      ok: true,
      correct: false,
    });
    expect(m.recordSolve).not.toHaveBeenCalled();
  });

  it("says a flag found twice was found already", async () => {
    m.findOwnSolve.mockResolvedValue({ disqualifiedAt: null, disqualifiedReason: null });
    expect(await submitTournamentFlag(ME, input, DURING)).toEqual({
      ok: true,
      correct: true,
      points: 0,
      already: true,
    });
    m.findOwnSolve.mockResolvedValue(null);
    m.recordSolve.mockResolvedValue(false);
    expect(await submitTournamentFlag(ME, input, DURING)).toMatchObject({ already: true });
  });

  it("says a flag the console took back was disqualified, and why, without scoring it", async () => {
    m.findOwnSolve.mockResolvedValue({
      disqualifiedAt: DURING,
      disqualifiedReason: "Flag partagé entre équipes",
    });
    expect(await submitTournamentFlag(ME, input, DURING)).toEqual({
      ok: false,
      error:
        "Ton flag pour ce défi a été disqualifié (Flag partagé entre équipes) : il ne compte plus.",
    });
    expect(m.recordSolve).not.toHaveBeenCalled();
  });

  it("takes no flag before the start, after the end, or from outside the classes", async () => {
    expect(await submitTournamentFlag(ME, input, BEFORE)).toEqual({
      ok: false,
      error: "Le tournoi n'a pas commencé.",
    });
    expect(await submitTournamentFlag(ME, input, AFTER)).toEqual({
      ok: false,
      error: "Le tournoi est terminé.",
    });
    m.accessOf.mockResolvedValue({ ...NOBODY, teaches: true });
    expect(await submitTournamentFlag(ME, input, DURING)).toEqual({
      ok: false,
      error: "Tu ne joues pas dans ce tournoi.",
    });
    expect(m.recordSolve).not.toHaveBeenCalled();
  });

  it("refuses a malformed input, a challenge not in the tournament, and too many tries", async () => {
    expect(await submitTournamentFlag(ME, { ...input, flag: "" }, DURING)).toMatchObject({
      ok: false,
    });
    m.findChallengeForFlag.mockResolvedValueOnce(null);
    expect(await submitTournamentFlag(ME, input, DURING)).toEqual({
      ok: false,
      error: "Défi introuvable.",
    });
    m.checkFlagSubmission.mockResolvedValueOnce({ success: false });
    expect(await submitTournamentFlag(ME, input, DURING)).toEqual({
      ok: false,
      error: "Trop d'essais : attends une minute.",
    });
  });
});

describe("tournamentChallengeFor", () => {
  const entry = {
    points: 100,
    challenge: {
      id: C1,
      slug: "journal",
      title: "Le journal",
      description: "Un journal à lire.",
      instructions: "## Ce qu'il faut faire",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      type: "CTF",
      machine: { files: [] },
      starterCode: null,
      attachmentUrl: null,
      resourceUrl: null,
    },
  };

  it("is hidden before the start", async () => {
    m.findChallenge.mockResolvedValue(entry);
    expect(await tournamentChallengeFor(ME, T, "journal", BEFORE)).toBeNull();
  });

  it("opens a challenge to its players while it runs", async () => {
    m.findChallenge.mockResolvedValue(entry);
    m.findOwnSolve.mockResolvedValue({ disqualifiedAt: null, disqualifiedReason: null });
    const page = await tournamentChallengeFor(ME, T, "journal", DURING);
    expect(page?.tournament).toMatchObject({ canPlay: true, myTeam: "SIO1-A", phase: "RUNNING" });
    expect(page?.challenge).toMatchObject({ points: 100, onMachine: true, title: "Le journal" });
    expect(page?.solved).toBe(true);
    expect(page?.disqualified).toBeNull();
    expect(page?.machine).toEqual({ files: [] });
  });

  it("says a flag the console took back is disqualified, with its reason", async () => {
    m.findChallenge.mockResolvedValue(entry);
    m.findOwnSolve.mockResolvedValue({
      disqualifiedAt: DURING,
      disqualifiedReason: "Flag partagé entre équipes",
    });
    const page = await tournamentChallengeFor(ME, T, "journal", DURING);
    // Still given, so the form stays closed; no longer counted, and the page says why.
    expect(page?.solved).toBe(true);
    expect(page?.disqualified).toEqual({ reason: "Flag partagé entre équipes" });
  });

  it("is neither found nor disqualified before the player gave the flag", async () => {
    m.findChallenge.mockResolvedValue(entry);
    const page = await tournamentChallengeFor(ME, T, "journal", DURING);
    expect(page?.solved).toBe(false);
    expect(page?.disqualified).toBeNull();
  });

  it("is not found for a slug outside the tournament", async () => {
    m.findChallenge.mockResolvedValue(null);
    expect(await tournamentChallengeFor(ME, T, "ailleurs", DURING)).toBeNull();
  });
});

describe("listTournamentsFor", () => {
  it("lists the reader's tournaments, an admin's being all of them", async () => {
    m.listVisibleTo.mockResolvedValue([
      {
        id: T,
        title: "CTF de la Toussaint",
        startsAt: new Date("2026-10-16T12:00:00Z"),
        endsAt: new Date("2026-10-16T14:00:00Z"),
        teamScope: "CLASS",
        _count: { classes: 2, challenges: 5 },
      },
    ]);
    const [summary] = await listTournamentsFor(ME, DURING);
    expect(summary).toMatchObject({ id: T, phase: "RUNNING", classCount: 2, challengeCount: 5 });
    expect(summary?.startsLabel).toMatch(/16 octobre/u);
    expect(m.listVisibleTo).toHaveBeenCalledWith(ME, false);
    m.findRoleById.mockResolvedValue({ role: "ADMIN" });
    await listTournamentsFor(ME, DURING);
    expect(m.listVisibleTo).toHaveBeenLastCalledWith(ME, true);
  });
});

describe("tournamentListFor", () => {
  const ROW = {
    id: T,
    title: "CTF de la Toussaint",
    startsAt: new Date("2026-10-16T12:00:00Z"),
    endsAt: new Date("2026-10-16T14:00:00Z"),
    teamScope: "CLASS",
    _count: { classes: 2, challenges: 5 },
  };

  it("asks nothing about classes when there are tournaments to show", async () => {
    m.listVisibleTo.mockResolvedValue([ROW]);
    const list = await tournamentListFor(ME, DURING);
    expect(list.tournaments).toHaveLength(1);
    expect(list.inClass).toBe(true);
    expect(m.findForMember).not.toHaveBeenCalled();
    expect(m.teachesAnyClass).not.toHaveBeenCalled();
  });

  it("says whether the reader of an empty list is in a class, or teaches one", async () => {
    m.listVisibleTo.mockResolvedValue([]);
    m.findForMember.mockResolvedValue([]);
    m.teachesAnyClass.mockResolvedValue(false);
    expect(await tournamentListFor(ME, DURING)).toEqual({ tournaments: [], inClass: false });

    m.findForMember.mockResolvedValue([{ id: CLASS_A }]);
    expect((await tournamentListFor(ME, DURING)).inClass).toBe(true);

    m.findForMember.mockResolvedValue([]);
    m.teachesAnyClass.mockResolvedValue(true);
    expect((await tournamentListFor(ME, DURING)).inClass).toBe(true);
    expect(m.findForMember).toHaveBeenCalledWith(ME);
    expect(m.teachesAnyClass).toHaveBeenCalledWith(ME);
  });
});
