import { describe, expect, it } from "vitest";
import {
  challengeStateLine,
  flagReplyLine,
  myStandingLine,
  type TournamentChallengeRow,
} from "../tournaments";

/** What the tournament screens say about a challenge, the reader's score and a flag. */

const ROW: TournamentChallengeRow = {
  id: "c1",
  slug: "journal",
  title: "Le journal",
  category: "CYBERSEC",
  difficulty: "BEGINNER",
  type: "CTF",
  points: 100,
  solvedByMe: false,
  solvedByMyTeam: false,
  solveCount: 0,
  firstTeam: null,
};

describe("challengeStateLine", () => {
  it("says who found the challenge, the reader first", () => {
    expect(challengeStateLine(ROW)).toBe("pas encore trouvé");
    expect(challengeStateLine({ ...ROW, solveCount: 1 })).toBe("1 flag trouvé");
    expect(challengeStateLine({ ...ROW, solveCount: 3 })).toBe("3 flags trouvés");
    expect(challengeStateLine({ ...ROW, solveCount: 3, solvedByMyTeam: true })).toBe(
      "trouvé par ton équipe",
    );
    expect(
      challengeStateLine({ ...ROW, solveCount: 3, solvedByMyTeam: true, solvedByMe: true }),
    ).toBe("trouvé par toi");
  });
});

describe("myStandingLine", () => {
  it("gives the reader's points, flags and place", () => {
    expect(myStandingLine({ points: 300, solved: 2, rank: 3 })).toBe("300 pts · 2 flags · 3e");
    expect(myStandingLine({ points: 100, solved: 1, rank: 1 })).toBe("100 pts · 1 flag · 1er");
    expect(myStandingLine({ points: 0, solved: 0, rank: null })).toBe("0 pts · 0 flag");
  });
});

describe("flagReplyLine", () => {
  it("says what the server answered to a flag", () => {
    expect(flagReplyLine({ ok: true, correct: true, points: 200, already: false })).toEqual({
      ok: true,
      text: "Flag accepté : +200 points pour toi et ton équipe.",
    });
    expect(flagReplyLine({ ok: true, correct: true, points: 0, already: true }).text).toBe(
      "Tu avais déjà trouvé ce flag.",
    );
    expect(flagReplyLine({ ok: true, correct: false })).toEqual({
      ok: false,
      text: "Ce n'est pas le flag. Essaie encore.",
    });
    expect(flagReplyLine({ ok: false, error: "Le tournoi est terminé." })).toEqual({
      ok: false,
      text: "Le tournoi est terminé.",
    });
  });
});
