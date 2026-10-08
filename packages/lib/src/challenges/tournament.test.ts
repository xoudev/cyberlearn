import { describe, expect, it } from "vitest";
import {
  byUrgency,
  challengeState,
  challengeStateLabel,
  challengeStatus,
  challengeTypeLabel,
  counted,
  countdownLabel,
  dateToParisLocal,
  durationLabel,
  elapsedShare,
  firstSolves,
  flagNotice,
  parisLocalToDate,
  phaseTallyWord,
  placeLabel,
  playerStandings,
  standingFigures,
  teamClassOf,
  teamFoundLabel,
  teamsLabel,
  teamStandings,
  tournamentDateLabel,
  tournamentPhase,
  tournamentTeams,
  tournamentWinners,
  windowProblem,
  type TournamentPhase,
  type TournamentSolveRow,
  type TournamentStandingInput,
} from "./tournament";

const at = (iso: string): Date => new Date(iso);

function solve(
  challengeId: string,
  userId: string | null,
  teamId: string,
  points: number,
  iso: string,
): TournamentSolveRow {
  return { challengeId, userId, teamId, points, solvedAt: at(iso) };
}

describe("tournamentPhase", () => {
  const window = { startsAt: at("2026-10-16T12:00:00Z"), endsAt: at("2026-10-16T14:00:00Z") };

  it("is upcoming before the start, running from it, finished from the end", () => {
    expect(tournamentPhase(window, at("2026-10-16T11:59:59Z"))).toBe("UPCOMING");
    expect(tournamentPhase(window, at("2026-10-16T12:00:00Z"))).toBe("RUNNING");
    expect(tournamentPhase(window, at("2026-10-16T13:59:59Z"))).toBe("RUNNING");
    expect(tournamentPhase(window, at("2026-10-16T14:00:00Z"))).toBe("FINISHED");
  });
});

describe("windowProblem", () => {
  it("accepts a window of a quarter of an hour to a month", () => {
    expect(
      windowProblem({ startsAt: at("2026-10-16T12:00:00Z"), endsAt: at("2026-10-16T12:15:00Z") }),
    ).toBeNull();
    expect(
      windowProblem({ startsAt: at("2026-10-01T00:00:00Z"), endsAt: at("2026-11-01T00:00:00Z") }),
    ).toBeNull();
  });

  it("refuses an end before the start, a window too short or too long", () => {
    expect(
      windowProblem({ startsAt: at("2026-10-16T12:00:00Z"), endsAt: at("2026-10-16T12:00:00Z") }),
    ).toBe("La fin doit venir après le début.");
    expect(
      windowProblem({ startsAt: at("2026-10-16T12:00:00Z"), endsAt: at("2026-10-16T12:10:00Z") }),
    ).toMatch(/au moins 15 minutes/u);
    expect(
      windowProblem({ startsAt: at("2026-10-01T00:00:00Z"), endsAt: at("2026-11-02T00:00:00Z") }),
    ).toMatch(/au plus 31 jours/u);
    expect(
      windowProblem({ startsAt: new Date(Number.NaN), endsAt: at("2026-10-01T00:00:00Z") }),
    ).not.toBeNull();
  });
});

describe("Paris time", () => {
  it("reads a datetime-local value in winter and in summer time", () => {
    expect(parisLocalToDate("2026-01-15T14:00")?.toISOString()).toBe("2026-01-15T13:00:00.000Z");
    expect(parisLocalToDate("2026-07-15T14:00")?.toISOString()).toBe("2026-07-15T12:00:00.000Z");
  });

  it("moves an hour that does not exist past the spring change", () => {
    // 29 March 2026: Paris goes from 02:00 straight to 03:00.
    expect(parisLocalToDate("2026-03-29T02:30")?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(parisLocalToDate("2026-03-29T03:30")?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });

  it("refuses what is not a date", () => {
    expect(parisLocalToDate("2026-02-30T10:00")).toBeNull();
    expect(parisLocalToDate("2026-10-16T25:00")).toBeNull();
    expect(parisLocalToDate("16/10/2026 14:00")).toBeNull();
    expect(parisLocalToDate("")).toBeNull();
  });

  it("gives back the value a datetime-local field takes", () => {
    expect(dateToParisLocal(at("2026-01-15T13:00:00Z"))).toBe("2026-01-15T14:00");
    expect(dateToParisLocal(at("2026-07-15T12:00:00Z"))).toBe("2026-07-15T14:00");
    const value = "2026-10-16T14:00";
    const date = parisLocalToDate(value);
    expect(date).not.toBeNull();
    if (date !== null) expect(dateToParisLocal(date)).toBe(value);
  });

  it("writes a date the way people read it", () => {
    expect(tournamentDateLabel(at("2026-10-16T12:00:00Z"))).toMatch(/vendredi 16 octobre.*14:00/u);
  });
});

describe("countdownLabel", () => {
  it("says what is left at the precision it deserves", () => {
    expect(countdownLabel((2 * 86_400 + 4 * 3600 + 59) * 1000)).toBe("2 j 4 h");
    expect(countdownLabel((3 * 3600 + 5 * 60) * 1000)).toBe("3 h 05 min");
    expect(countdownLabel((12 * 60 + 3) * 1000)).toBe("12 min 03 s");
    expect(countdownLabel(45_400)).toBe("45 s");
    expect(countdownLabel(-5000)).toBe("0 s");
  });
});

describe("counted", () => {
  it("puts the noun in the plural from two", () => {
    expect(counted(0, "flag")).toBe("0 flag");
    expect(counted(1, "défi")).toBe("1 défi");
    expect(counted(3, "classe")).toBe("3 classes");
  });
});

describe("durationLabel", () => {
  it("says a length to the minute, without the units at zero", () => {
    expect(durationLabel(15 * 60_000)).toBe("15 min");
    expect(durationLabel(2 * 3_600_000)).toBe("2 h");
    expect(durationLabel(2.5 * 3_600_000)).toBe("2 h 30");
    expect(durationLabel((2 * 60 + 5) * 60_000)).toBe("2 h 05");
    expect(durationLabel(86_400_000)).toBe("1 jour");
    expect(durationLabel(3 * 86_400_000 + 4 * 3_600_000)).toBe("3 jours 4 h");
    // A day long does not drop its minutes: Friday 09:00 to Saturday 09:45.
    expect(durationLabel(86_400_000 + 45 * 60_000)).toBe("1 jour 45 min");
    expect(durationLabel(2 * 86_400_000 + (3 * 60 + 15) * 60_000)).toBe("2 jours 3 h 15");
    expect(durationLabel(86_400_000 + (23 * 60 + 59) * 60_000)).toBe("1 jour 23 h 59");
    expect(durationLabel(-5000)).toBe("0 min");
  });
});

describe("elapsedShare", () => {
  const window = { startsAt: "2026-10-16T12:00:00.000Z", endsAt: "2026-10-16T14:00:00.000Z" };

  it("is the share of the window gone by, held between 0 and 1", () => {
    expect(elapsedShare(window, Date.parse("2026-10-16T11:00:00.000Z"))).toBe(0);
    expect(elapsedShare(window, Date.parse("2026-10-16T13:00:00.000Z"))).toBe(0.5);
    expect(elapsedShare(window, Date.parse("2026-10-16T15:00:00.000Z"))).toBe(1);
  });

  it("does not divide by an empty window", () => {
    const empty = { startsAt: window.startsAt, endsAt: window.startsAt };
    expect(elapsedShare(empty, Date.parse("2026-10-16T11:00:00.000Z"))).toBe(0);
    expect(elapsedShare(empty, Date.parse("2026-10-16T12:00:00.000Z"))).toBe(1);
  });
});

describe("byUrgency", () => {
  const t = (id: string, phase: TournamentPhase, startsAt: string, endsAt: string) => ({
    id,
    phase,
    startsAt,
    endsAt,
  });

  it("puts the running first, then the next to open, then the last to have closed", () => {
    const sorted = [
      t("old", "FINISHED", "2026-09-01T09:00:00Z", "2026-09-02T09:00:00Z"),
      t("later", "UPCOMING", "2026-11-20T09:00:00Z", "2026-11-21T09:00:00Z"),
      t("live-long", "RUNNING", "2026-10-16T09:00:00Z", "2026-10-18T09:00:00Z"),
      t("recent", "FINISHED", "2026-10-01T09:00:00Z", "2026-10-02T09:00:00Z"),
      t("sooner", "UPCOMING", "2026-10-30T09:00:00Z", "2026-10-30T10:00:00Z"),
      t("live-short", "RUNNING", "2026-10-16T09:00:00Z", "2026-10-16T11:00:00Z"),
    ].sort(byUrgency);
    expect(sorted.map((x) => x.id)).toEqual([
      "live-short",
      "live-long",
      "sooner",
      "later",
      "recent",
      "old",
    ]);
  });
});

describe("phaseTallyWord", () => {
  it("gives a phase its word, the finished ones in the plural from two", () => {
    expect(phaseTallyWord("RUNNING", 3)).toBe("en cours");
    expect(phaseTallyWord("UPCOMING", 2)).toBe("à venir");
    expect(phaseTallyWord("FINISHED", 1)).toBe("terminé");
    expect(phaseTallyWord("FINISHED", 2)).toBe("terminés");
  });
});

describe("teamsLabel", () => {
  it("counts the classes, and the schools when schools play", () => {
    expect(teamsLabel("CLASS", 4, 4)).toBe("4 classes");
    expect(teamsLabel("ESTABLISHMENT", 2, 5)).toBe("2 écoles · 5 classes");
    expect(teamsLabel("ESTABLISHMENT", 1, 1)).toBe("1 école · 1 classe");
  });
});

describe("tournamentWinners", () => {
  it("is the team or the teams at the top, once someone has scored", () => {
    const teams = [
      { name: "a", rank: 1, points: 300 },
      { name: "b", rank: 1, points: 300 },
      { name: "c", rank: 3, points: 100 },
    ];
    expect(tournamentWinners(teams).map((team) => team.name)).toEqual(["a", "b"]);
    expect(tournamentWinners(teams.map((team) => ({ ...team, rank: 1, points: 0 })))).toEqual([]);
  });
});

describe("standingFigures", () => {
  const teams = [
    { rank: 1, points: 100, isMine: false },
    { rank: 2, points: 100, isMine: true },
  ];
  const view: TournamentStandingInput = {
    phase: "RUNNING",
    teamScope: "CLASS",
    teams,
    me: { points: 0, solved: 0, rank: 2 },
  };
  const zero = teams.map((team) => ({ ...team, rank: 1, points: 0 }));

  it("names the team's place among the classes, the reader's, their points and flags", () => {
    expect(standingFigures(view)).toEqual([
      { key: "team", label: "Ton équipe", value: "2e", unit: null, note: "sur 2 classes" },
      { key: "place", label: "Ta place", value: "2e", unit: null, note: null },
      { key: "points", label: "Tes points", value: "0", unit: "pts", note: null },
      { key: "flags", label: "Tes flags", value: "0", unit: "flag", note: null },
    ]);
  });

  it("counts the schools when schools play, and the flags in the plural", () => {
    const figures = standingFigures({
      ...view,
      teamScope: "ESTABLISHMENT",
      me: { points: 300, solved: 2, rank: 1 },
    });
    expect(figures?.[0]?.note).toBe("sur 2 écoles");
    expect(figures?.[1]?.value).toBe("1er");
    expect(figures?.[3]).toEqual({
      key: "flags",
      label: "Tes flags",
      value: "2",
      unit: "flags",
      note: null,
    });
  });

  it("gives no place while nobody has scored, and says why", () => {
    const running = standingFigures({
      ...view,
      teams: zero,
      me: { points: 0, solved: 0, rank: null },
    });
    expect(running?.[0]).toEqual({
      key: "team",
      label: "Ton équipe",
      value: null,
      unit: null,
      note: "Personne n'a encore marqué",
    });
    expect(running?.[1]?.note).toBe("Pas encore de flag");
    const over = standingFigures({
      ...view,
      phase: "FINISHED",
      teams: zero,
      me: { points: 0, solved: 0, rank: null },
    });
    expect(over?.[0]?.note).toBe("Personne n'a marqué");
    expect(over?.[1]?.note).toBe("Aucun flag");
  });

  it("says a reader with flags but no place hid from the ranking", () => {
    const figures = standingFigures({ ...view, me: { points: 100, solved: 1, rank: null } });
    expect(figures?.[1]).toEqual({
      key: "place",
      label: "Ta place",
      value: null,
      unit: null,
      note: "Masqué du classement",
    });
  });

  it("has nothing to say for someone who does not play", () => {
    expect(standingFigures({ ...view, me: null })).toBeNull();
  });
});

describe("challengeTypeLabel", () => {
  it("names a type in words, and an unknown one as it is", () => {
    expect(challengeTypeLabel("CTF")).toBe("CTF");
    expect(challengeTypeLabel("SCRIPT")).toBe("Script");
    expect(challengeTypeLabel("LAB")).toBe("LAB");
  });
});

describe("challengeState", () => {
  const row = { solvedByMe: false, solvedByMyTeam: false, solveCount: 0 };

  it("says who found the challenge, the reader first", () => {
    expect(challengeState(row)).toBe("open");
    expect(challengeState({ ...row, solveCount: 2 })).toBe("found");
    expect(challengeState({ ...row, solveCount: 2, solvedByMyTeam: true })).toBe("team");
    expect(challengeState({ solvedByMe: true, solvedByMyTeam: true, solveCount: 2 })).toBe("mine");
  });

  it("says it in words, without a 'yet' once it is over", () => {
    expect(challengeStateLabel(row, false)).toBe("pas encore trouvé");
    expect(challengeStateLabel(row, true)).toBe("pas trouvé");
    expect(challengeStateLabel({ ...row, solveCount: 1 }, false)).toBe("1 flag trouvé");
    expect(challengeStateLabel({ ...row, solveCount: 3 }, true)).toBe("3 flags trouvés");
    expect(challengeStateLabel({ ...row, solveCount: 3, solvedByMyTeam: true }, false)).toBe(
      "trouvé par ton équipe",
    );
    expect(
      challengeStateLabel({ solvedByMe: true, solvedByMyTeam: true, solveCount: 3 }, true),
    ).toBe("trouvé par toi");
  });
});

describe("teamFoundLabel", () => {
  it("counts the challenges the reader's team found among all", () => {
    expect(teamFoundLabel(0, 3)).toBe("0 sur 3 trouvé par ton équipe");
    expect(teamFoundLabel(2, 3)).toBe("2 sur 3 trouvés par ton équipe");
  });
});

describe("challengeStatus and flagNotice", () => {
  it("is found, to find, out of reach once over, or only to read", () => {
    const player = { myTeam: "SIO1-A" };
    expect(challengeStatus({ phase: "RUNNING", canPlay: true, ...player }, true)).toBe("solved");
    expect(challengeStatus({ phase: "FINISHED", canPlay: false, ...player }, true)).toBe("solved");
    expect(challengeStatus({ phase: "RUNNING", canPlay: true, ...player }, false)).toBe("open");
    expect(challengeStatus({ phase: "FINISHED", canPlay: false, ...player }, false)).toBe("closed");
  });

  it("is only to read for someone who plays for no team, before the end as after it", () => {
    const watcher = { canPlay: false, myTeam: null };
    expect(challengeStatus({ phase: "RUNNING", ...watcher }, false)).toBe("watch");
    expect(challengeStatus({ phase: "FINISHED", ...watcher }, false)).toBe("watch");
  });

  it("says why no flag can be given, and nothing while one can", () => {
    expect(flagNotice({ phase: "RUNNING", canPlay: true, myTeam: "SIO1-A" })).toBeNull();
    expect(flagNotice({ phase: "FINISHED", canPlay: false, myTeam: "SIO1-A" })).toBe(
      "Le tournoi est terminé : les flags ne comptent plus.",
    );
    expect(flagNotice({ phase: "RUNNING", canPlay: false, myTeam: null })).toBe(
      "Seuls les élèves des classes du tournoi y donnent un flag.",
    );
  });
});

describe("teamClassOf", () => {
  const participating = new Set(["sio1-a", "sio1-b"]);

  it("is the class taking part that the player joined first", () => {
    expect(
      teamClassOf(
        [
          { classId: "club-cyber", joinedAt: at("2025-09-01T00:00:00Z") },
          { classId: "sio1-b", joinedAt: at("2025-10-01T00:00:00Z") },
          { classId: "sio1-a", joinedAt: at("2025-09-15T00:00:00Z") },
        ],
        participating,
      ),
    ).toBe("sio1-a");
  });

  it("is null for someone in none of them", () => {
    expect(
      teamClassOf([{ classId: "club-cyber", joinedAt: at("2025-09-01T00:00:00Z") }], participating),
    ).toBeNull();
  });
});

describe("tournamentTeams", () => {
  const classes = [
    { id: "b", name: "SIO1-B", schoolId: "jm", schoolName: "Lycée Jean Moulin" },
    { id: "a", name: "SIO1-A", schoolId: "jm", schoolName: "Lycée Jean Moulin" },
    { id: "c", name: "BTS CIEL", schoolId: "vh", schoolName: "Lycée Victor Hugo" },
  ];

  it("makes each class a team, named with its school", () => {
    const { teams, teamOfClass } = tournamentTeams("CLASS", classes);
    expect(teams).toEqual([
      { id: "c", name: "BTS CIEL", detail: "Lycée Victor Hugo" },
      { id: "a", name: "SIO1-A", detail: "Lycée Jean Moulin" },
      { id: "b", name: "SIO1-B", detail: "Lycée Jean Moulin" },
    ]);
    expect(teamOfClass.get("b")).toBe("b");
  });

  it("puts the classes of a school together, school against school", () => {
    const { teams, teamOfClass } = tournamentTeams("ESTABLISHMENT", classes);
    expect(teams).toEqual([
      { id: "jm", name: "Lycée Jean Moulin", detail: "SIO1-A, SIO1-B" },
      { id: "vh", name: "Lycée Victor Hugo", detail: "BTS CIEL" },
    ]);
    expect(teamOfClass.get("a")).toBe("jm");
    expect(teamOfClass.get("c")).toBe("vh");
  });
});

describe("teamStandings", () => {
  it("counts a challenge once per team, at its first solve", () => {
    const standings = teamStandings(
      ["a", "b"],
      [
        solve("web", "ana", "a", 100, "2026-10-16T12:10:00Z"),
        solve("web", "leo", "a", 100, "2026-10-16T12:20:00Z"),
        solve("web", "zoe", "b", 100, "2026-10-16T12:15:00Z"),
        solve("crypto", "zoe", "b", 300, "2026-10-16T12:40:00Z"),
      ],
    );
    expect(standings).toEqual([
      { teamId: "b", rank: 1, points: 400, solved: 2, reachedAt: at("2026-10-16T12:40:00Z") },
      { teamId: "a", rank: 2, points: 100, solved: 1, reachedAt: at("2026-10-16T12:10:00Z") },
    ]);
  });

  it("ranks first, at equal points, the team that got there first", () => {
    const standings = teamStandings(
      ["a", "b"],
      [
        solve("web", "ana", "a", 200, "2026-10-16T12:30:00Z"),
        solve("crypto", "zoe", "b", 200, "2026-10-16T12:20:00Z"),
      ],
    );
    expect(standings.map((s) => [s.teamId, s.rank])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });

  it("lists a team without a flag last, and ties the teams still at zero", () => {
    const standings = teamStandings(
      ["c", "a", "b"],
      [solve("web", "ana", "a", 100, "2026-10-16T12:10:00Z")],
    );
    expect(standings.map((s) => [s.teamId, s.rank, s.points])).toEqual([
      ["a", 1, 100],
      ["c", 2, 0],
      ["b", 2, 0],
    ]);
  });

  it("keeps the points of an erased account for its team", () => {
    const [team] = teamStandings(["a"], [solve("web", null, "a", 100, "2026-10-16T12:10:00Z")]);
    expect(team?.points).toBe(100);
  });
});

describe("playerStandings", () => {
  it("adds up each player's own flags, the earlier score first at equal points", () => {
    const standings = playerStandings([
      solve("web", "ana", "a", 100, "2026-10-16T12:10:00Z"),
      solve("web", "leo", "a", 100, "2026-10-16T12:05:00Z"),
      solve("crypto", "ana", "a", 300, "2026-10-16T12:50:00Z"),
      solve("crypto", "zoe", "b", 300, "2026-10-16T12:40:00Z"),
      solve("web", "zoe", "b", 100, "2026-10-16T12:45:00Z"),
      solve("web", null, "b", 100, "2026-10-16T12:00:00Z"),
    ]);
    expect(standings.map((s) => [s.userId, s.rank, s.points, s.solved])).toEqual([
      ["zoe", 1, 400, 2],
      ["ana", 2, 400, 2],
      ["leo", 3, 100, 1],
    ]);
  });
});

describe("firstSolves", () => {
  it("is the first solve of each challenge", () => {
    const firsts = firstSolves([
      solve("web", "leo", "a", 100, "2026-10-16T12:20:00Z"),
      solve("web", "zoe", "b", 100, "2026-10-16T12:15:00Z"),
      solve("crypto", "ana", "a", 300, "2026-10-16T12:40:00Z"),
    ]);
    expect(firsts.get("web")?.userId).toBe("zoe");
    expect(firsts.get("crypto")?.teamId).toBe("a");
  });
});

describe("placeLabel", () => {
  it("writes a rank as a place", () => {
    expect(placeLabel(1)).toBe("1er");
    expect(placeLabel(2)).toBe("2e");
  });
});
