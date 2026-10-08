import { describe, expect, it } from "vitest";
import { sourceKey, type MockSource } from "../exam/mock";
import { randomFromText } from "../exercises/arrange";
import {
  DUEL_STATUS_LABELS,
  OUTCOME_LABEL,
  RESULT_TITLE,
  VERDICT_LABEL,
  VERDICT_OUTCOME,
  checkDuelAnswer,
  deadlineLabel,
  drawDuel,
  duelActionLabel,
  duelQuestions,
  duelRecord,
  duelSmallPrint,
  duelWinner,
  idleScoreWord,
  isExpired,
  isSettled,
  nextDuelQuestion,
  otherMarks,
  outcomeOf,
  outcomeText,
  readerMarks,
  reviewRows,
  rightAnswersWord,
  scoreLine,
  tallyFor,
  tieBreakNote,
  wasPlayed,
  type DuelOutcome,
  type DuelQuestion,
  type DuelStatus,
  type ReaderDuel,
} from "./duel";

/**
 * A duel over a small path: five questions drawn, no answer key in what is
 * shown, an answer checked and its right option revealed, each player's
 * tally, the winner (right answers, then who finished first), the expiry;
 * then the words both apps write a duel in for its reader, its scoreboard's
 * squares and the review of the reader's answers.
 */

function quiz(lessonId: string, quizId: string): MockSource {
  return {
    lessonId,
    quizId,
    domain: "Module 01",
    question: `Question ${lessonId}/${quizId} ?`,
    options: ["A", "B", "C"],
    correct: 2,
    explanation: null,
  };
}

const SOURCES = ["l1", "l2", "l3", "l4"].flatMap((l) => [quiz(l, "q1"), quiz(l, "q2")]);
const byKey = new Map(SOURCES.map((s) => [sourceKey(s.lessonId, s.quizId), s]));
const at = (s: number): Date => new Date(Date.UTC(2026, 9, 7, 12, 0, s));

describe("drawDuel and duelQuestions", () => {
  it("draws five distinct quizzes with shuffled options, the same for a given seed", () => {
    const refs = drawDuel(SOURCES, 5, randomFromText("duel-1"));
    expect(refs).toHaveLength(5);
    expect(new Set(refs.map((r) => sourceKey(r.lessonId, r.quizId))).size).toBe(5);
    for (const ref of refs) expect([...ref.order].sort()).toEqual([0, 1, 2]);
    expect(drawDuel(SOURCES, 5, randomFromText("duel-1"))).toEqual(refs);
    const shown = duelQuestions(refs, byKey);
    expect(shown).toHaveLength(5);
    expect(JSON.stringify(shown)).not.toContain('"correct"');
  });
});

describe("checkDuelAnswer", () => {
  const ref = { lessonId: "l1", quizId: "q1", domain: "Module 01", order: [2, 0, 1] };

  it("says whether the pick is right, and which shown option was", () => {
    expect(checkDuelAnswer(ref, byKey, 0)).toEqual({ correct: true, correctIndex: 0 });
    expect(checkDuelAnswer(ref, byKey, 2)).toEqual({ correct: false, correctIndex: 0 });
  });

  it("refuses a pick out of range and a quiz no longer in its lesson", () => {
    expect(checkDuelAnswer(ref, byKey, 3)).toBeNull();
    expect(checkDuelAnswer(ref, byKey, -1)).toBeNull();
    expect(checkDuelAnswer({ ...ref, quizId: "gone" }, byKey, 0)).toBeNull();
  });
});

describe("tallyFor and duelWinner", () => {
  const answers = [
    { userId: "a", index: 0, correct: true, answeredAt: at(5) },
    { userId: "a", index: 1, correct: false, answeredAt: at(9) },
    { userId: "a", index: 2, correct: true, answeredAt: at(14) },
    { userId: "b", index: 0, correct: true, answeredAt: at(4) },
    { userId: "b", index: 1, correct: true, answeredAt: at(8) },
  ];

  it("counts each player's answers, right answers and finish", () => {
    expect(tallyFor("a", answers, 3)).toEqual({ answered: 3, correct: 2, finishedAt: at(14) });
    expect(tallyFor("b", answers, 3)).toEqual({ answered: 2, correct: 2, finishedAt: null });
    expect(tallyFor("c", answers, 3)).toEqual({ answered: 0, correct: 0, finishedAt: null });
  });

  it("gives the duel to the most right answers, then to whoever finished first", () => {
    const a = { answered: 3, correct: 2, finishedAt: at(14) };
    expect(duelWinner(a, { answered: 3, correct: 1, finishedAt: at(10) })).toBe("challenger");
    expect(duelWinner(a, { answered: 3, correct: 2, finishedAt: at(12) })).toBe("opponent");
    expect(duelWinner(a, { answered: 2, correct: 2, finishedAt: null })).toBe("challenger");
    expect(
      duelWinner(
        { answered: 1, correct: 0, finishedAt: null },
        { answered: 0, correct: 0, finishedAt: null },
      ),
    ).toBe("draw");
  });

  it("writes the result and the score in the reader's words", () => {
    expect(outcomeText("challenger", true)).toBe("Victoire !");
    expect(outcomeText("challenger", false)).toBe("Défaite.");
    expect(outcomeText("draw", false)).toBe("Égalité.");
    expect(RESULT_TITLE).toEqual({ win: "Victoire !", loss: "Défaite.", draw: "Égalité." });
    expect(scoreLine({ answered: 5, correct: 3, finishedAt: null }, 5)).toBe("3 / 5");
    expect(DUEL_STATUS_LABELS.PENDING).toBe("En attente");
  });
});

describe("isExpired", () => {
  it("lapses a pending or active duel past its time, never a finished one", () => {
    expect(isExpired({ status: "PENDING", expiresAt: at(0) }, at(1))).toBe(true);
    expect(isExpired({ status: "ACTIVE", expiresAt: at(5) }, at(1))).toBe(false);
    expect(isExpired({ status: "FINISHED", expiresAt: at(0) }, at(1))).toBe(false);
  });
});

describe("a duel in the reader's words", () => {
  const settled = (winner: ReaderDuel["winner"]): ReaderDuel => ({ status: "FINISHED", winner });
  const open = (status: DuelStatus): ReaderDuel => ({ status, winner: null });

  it("reads the outcome from the state and, once settled, the winner", () => {
    expect(outcomeOf(settled("reader"))).toBe("win");
    expect(outcomeOf(settled("other"))).toBe("loss");
    expect(outcomeOf(settled("draw"))).toBe("draw");
    expect(outcomeOf(open("ACTIVE"))).toBe("live");
    expect(outcomeOf(open("PENDING"))).toBe("wait");
    expect(outcomeOf(open("DECLINED"))).toBe("declined");
    expect(outcomeOf(open("EXPIRED"))).toBe("expired");
    expect(OUTCOME_LABEL.win).toBe("Victoire");
    expect(OUTCOME_LABEL.live).toBe(DUEL_STATUS_LABELS.ACTIVE);
    expect(OUTCOME_LABEL.expired).toBe("Expiré");
  });

  it("has a score for a duel played, none for one declined or never accepted", () => {
    const played: DuelOutcome[] = ["win", "loss", "draw", "live"];
    const unplayed: DuelOutcome[] = ["wait", "declined", "expired"];
    expect(played.every(wasPlayed)).toBe(true);
    expect(unplayed.some(wasPlayed)).toBe(false);
    expect(isSettled("draw")).toBe(true);
    expect(isSettled("live")).toBe(false);
  });

  it("keeps the record: results always, what is open only when there is some", () => {
    expect(duelRecord([])).toEqual([
      { outcome: "win", n: 0, word: "victoire" },
      { outcome: "loss", n: 0, word: "défaite" },
      { outcome: "draw", n: 0, word: "égalité" },
    ]);
    const record = duelRecord([
      settled("reader"),
      settled("reader"),
      settled("draw"),
      open("ACTIVE"),
      open("ACTIVE"),
      open("PENDING"),
      open("PENDING"),
      open("DECLINED"),
    ]);
    expect(record.map((line) => `${String(line.n)} ${line.word}`)).toEqual([
      "2 victoires",
      "0 défaite",
      "1 égalité",
      "2 en cours",
      "2 en attente",
    ]);
    expect(duelRecord([open("PENDING")]).map((line) => `${String(line.n)} ${line.word}`)).toEqual([
      "0 victoire",
      "0 défaite",
      "0 égalité",
      "1 en attente",
    ]);
  });

  it("says what opening the duel does: play on the reader's turn, look otherwise", () => {
    const live = { ...open("ACTIVE"), questionCount: 5, readerScore: { answered: 2 } };
    expect(duelActionLabel(live)).toBe("À toi de jouer");
    expect(duelActionLabel({ ...live, readerScore: { answered: 5 } })).toBe("Suivre le duel");
    expect(duelActionLabel({ ...live, ...settled("other") })).toBe("Revoir le duel");
    expect(duelActionLabel({ ...live, ...open("EXPIRED") })).toBe("Voir le duel");
  });

  it("writes the small print: each one's answers, the deadline, who started it", () => {
    const duel = {
      ...open("ACTIVE"),
      questionCount: 5,
      readerScore: { answered: 3 },
      otherScore: { answered: 1 },
      other: { name: "Alex" },
      readerIsChallenger: false,
      createdAt: "2026-10-08T10:00:00.000Z",
      expiresAt: "2026-10-09T10:00:00.000Z",
    };
    const dates = { when: (iso: string) => `le ${iso}`, day: (iso: string) => iso.slice(0, 10) };
    expect(duelSmallPrint(duel, dates)).toBe("Répondu : toi 3 / 5, Alex 1 / 5");
    expect(duelSmallPrint({ ...duel, ...open("PENDING") }, dates)).toBe(
      "Expire le 2026-10-09T10:00:00.000Z",
    );
    expect(duelSmallPrint({ ...duel, ...settled("reader") }, dates)).toBe(
      "Lancé par Alex · 2026-10-08",
    );
    expect(duelSmallPrint({ ...duel, ...open("DECLINED"), readerIsChallenger: true }, dates)).toBe(
      "Lancé par toi · 2026-10-08",
    );
  });

  it("says who finished first when the right answers are level", () => {
    const tie = {
      readerScore: { correct: 3 },
      otherScore: { correct: 3 },
      other: { name: "Alex" },
    };
    expect(tieBreakNote({ ...tie, ...settled("reader") })).toBe(
      "À égalité de bonnes réponses : tu as fini avant Alex.",
    );
    expect(tieBreakNote({ ...tie, ...settled("other") })).toBe(
      "À égalité de bonnes réponses : Alex a fini avant toi.",
    );
    expect(tieBreakNote({ ...tie, ...settled("draw") })).toBeNull();
    expect(tieBreakNote({ ...tie, ...settled("reader"), otherScore: { correct: 2 } })).toBeNull();
  });

  it("says until when the duel waits, and nothing once it is over", () => {
    expect(deadlineLabel("PENDING")).toBe("À accepter d'ici");
    expect(deadlineLabel("ACTIVE")).toBe("À jouer d'ici");
    expect(deadlineLabel("FINISHED")).toBeNull();
    expect(deadlineLabel("EXPIRED")).toBeNull();
  });

  it("has no score before the duel is played, and words the right answers", () => {
    expect(idleScoreWord("PENDING")).toBe("pas commencé");
    expect(idleScoreWord("DECLINED")).toBe("pas joué");
    expect(idleScoreWord("EXPIRED")).toBe("pas joué");
    expect(idleScoreWord("ACTIVE")).toBeNull();
    expect(idleScoreWord("FINISHED")).toBeNull();
    expect(rightAnswersWord(0)).toBe("bonne réponse");
    expect(rightAnswersWord(1)).toBe("bonne réponse");
    expect(rightAnswersWord(3)).toBe("bonnes réponses");
  });
});

describe("a duel's board", () => {
  const questions: DuelQuestion[] = [
    { index: 0, domain: "M1", question: "Un ?", options: ["A", "B"] },
    { index: 1, domain: "M1", question: "Deux ?", options: ["A", "B"] },
    { index: 2, domain: "", question: "Trois ?", options: ["A", "B"] },
  ];

  it("marks a square a question: the reader's verdicts and next one, the other's count", () => {
    const answers = [{ index: 0, correct: true }];
    expect(readerMarks(3, answers, 1)).toEqual(["right", "current", "todo"]);
    expect(readerMarks(3, [...answers, { index: 1, correct: false }], null)).toEqual([
      "right",
      "wrong",
      "todo",
    ]);
    expect(otherMarks(3, 1)).toEqual(["done", "todo", "todo"]);
    expect(otherMarks(2, 0)).toEqual(["todo", "todo"]);
  });

  it("gives the next question the reader has not answered, none once all are", () => {
    expect(nextDuelQuestion(questions, [{ index: 0 }])?.question).toBe("Deux ?");
    expect(nextDuelQuestion(questions, [{ index: 1 }])?.question).toBe("Un ?");
    expect(nextDuelQuestion(questions, [{ index: 0 }, { index: 1 }, { index: 2 }])).toBeNull();
  });

  it("lays out the reader's answers, the right one named where they missed", () => {
    const rows = reviewRows(questions, [
      { index: 0, selected: 1, correct: true, correctIndex: 1 },
      { index: 1, selected: 0, correct: false, correctIndex: 1 },
    ]);
    expect(rows).toEqual([
      {
        index: 0,
        domain: "M1",
        question: "Un ?",
        given: "Ta réponse : B",
        right: null,
        verdict: "right",
      },
      {
        index: 1,
        domain: "M1",
        question: "Deux ?",
        given: "Ta réponse : A",
        right: "B",
        verdict: "wrong",
      },
      {
        index: 2,
        domain: "",
        question: "Trois ?",
        given: "Pas répondu à temps.",
        right: null,
        verdict: "none",
      },
    ]);
    // A miss whose right option was not revealed names none.
    expect(
      reviewRows(questions, [{ index: 0, selected: 0, correct: false, correctIndex: null }])[0],
    ).toMatchObject({ right: null, verdict: "wrong" });
    expect(VERDICT_LABEL).toEqual({ right: "Juste", wrong: "Raté", none: "Sans réponse" });
    expect(VERDICT_OUTCOME).toEqual({ right: "win", wrong: "loss", none: "draw" });
  });
});
