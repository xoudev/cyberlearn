import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  dateToParisLocal,
  firstSolves,
  parisLocalToDate,
  placeLabel,
  playerStandings,
  teamClassOf,
  teamStandings,
  tournamentDateLabel,
  tournamentPhase,
  tournamentTeams,
  windowProblem,
  type TournamentSolveRow,
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
