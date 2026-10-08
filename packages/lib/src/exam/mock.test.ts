import { describe, expect, it } from "vitest";
import { randomFromText } from "../exercises/arrange";
import {
  ANSWER_WORD,
  answerCounts,
  answerState,
  bestScore,
  clientQuestions,
  domainVerdict,
  domainsOf,
  drawMockExam,
  lastDomainScores,
  MOCK_LAST_MINUTE_MS,
  mockAdvice,
  mockClock,
  mockParts,
  mockTimeLimitMinutes,
  optionKey,
  optionTag,
  scoreMockExam,
  sourceKey,
  unansweredQuestions,
  verdictTone,
  weakestDomains,
  type MockQuestion,
  type MockSource,
} from "./mock";

/**
 * A mock exam over a small path: a few questions from each module, the
 * options shuffled, no answer key in what is shown, a score per domain, a
 * question that left its lesson left out of the count, and the advice; then
 * what both apps read off it: the clock, the paper by module, the blanks, the
 * answers counted and tagged, the best of the history and the last score of
 * each module.
 */

function quiz(lessonId: string, quizId: string, domain: string, correct = 1): MockSource {
  return {
    lessonId,
    quizId,
    domain,
    question: `Question ${lessonId}/${quizId} ?`,
    options: ["A", "B", "C", "D"],
    correct,
    explanation: `Parce que ${lessonId}.`,
  };
}

const SOURCES: MockSource[] = [
  quiz("l1", "q1", "Les fichiers"),
  quiz("l1", "q2", "Les fichiers"),
  quiz("l2", "q1", "Les fichiers"),
  quiz("l2", "q2", "Les fichiers"),
  quiz("l3", "q1", "Les droits"),
  quiz("l3", "q2", "Les droits"),
  quiz("l4", "q1", "Le réseau"),
];

const byKey = new Map(SOURCES.map((s) => [sourceKey(s.lessonId, s.quizId), s]));

describe("drawMockExam", () => {
  it("takes a few questions from each domain, in the path's order, options shuffled", () => {
    const refs = drawMockExam(SOURCES, 3, randomFromText("examen-1"));
    expect(refs.map((r) => r.domain)).toEqual([
      "Les fichiers",
      "Les fichiers",
      "Les fichiers",
      "Les droits",
      "Les droits",
      "Le réseau",
    ]);
    expect(new Set(refs.map((r) => sourceKey(r.lessonId, r.quizId))).size).toBe(6);
    for (const ref of refs) expect([...ref.order].sort()).toEqual([0, 1, 2, 3]);
    expect(drawMockExam(SOURCES, 3, randomFromText("examen-1"))).toEqual(refs);
  });

  it("lists the domains with what each has", () => {
    expect(domainsOf(SOURCES)).toEqual([
      { domain: "Les fichiers", available: 4 },
      { domain: "Les droits", available: 2 },
      { domain: "Le réseau", available: 1 },
    ]);
  });
});

describe("clientQuestions", () => {
  it("shows the question and its options in drawn order, without the answer", () => {
    const refs = [{ lessonId: "l1", quizId: "q1", domain: "Les fichiers", order: [3, 1, 0, 2] }];
    expect(clientQuestions(refs, byKey)).toEqual([
      {
        index: 0,
        domain: "Les fichiers",
        question: "Question l1/q1 ?",
        options: ["D", "B", "A", "C"],
      },
    ]);
    expect(JSON.stringify(clientQuestions(refs, byKey))).not.toContain("Parce que");
  });
});

describe("scoreMockExam", () => {
  const refs = [
    { lessonId: "l1", quizId: "q1", domain: "Les fichiers", order: [3, 1, 0, 2] },
    { lessonId: "l2", quizId: "q1", domain: "Les fichiers", order: [0, 1, 2, 3] },
    { lessonId: "l3", quizId: "q1", domain: "Les droits", order: [1, 0, 2, 3] },
    { lessonId: "gone", quizId: "q9", domain: "Le réseau", order: [0, 1, 2, 3] },
  ];

  it("scores by domain, a blank counts as wrong, a vanished quiz is left out", () => {
    // Right answer is the original option 1 ("B"): shown at 1, 1 and 0.
    const result = scoreMockExam(refs, byKey, { "0": 1, "1": 3, "2": 0, "3": 0 });
    expect(result.total).toBe(3);
    expect(result.correct).toBe(2);
    expect(result.score).toBe(67);
    expect(result.domains).toEqual([
      { domain: "Les fichiers", correct: 1, total: 2, percent: 50 },
      { domain: "Les droits", correct: 1, total: 1, percent: 100 },
    ]);
    expect(result.review[0]).toMatchObject({ selected: 1, correct: 1, right: true });
    expect(result.review[1]).toMatchObject({ selected: 3, correct: 1, right: false });
    expect(result.review[2]?.explanation).toBe("Parce que l3.");
  });

  it("ignores an answer out of range, and a quiz whose options changed", () => {
    const changed = new Map(byKey);
    changed.set(sourceKey("l1", "q1"), {
      ...quiz("l1", "q1", "Les fichiers"),
      options: ["A", "B"],
    });
    const result = scoreMockExam(refs.slice(0, 2), changed, { "1": 9 });
    expect(result.total).toBe(1);
    expect(result.review[0]).toMatchObject({ index: 1, selected: null, right: false });
    expect(result.score).toBe(0);
  });
});

describe("time and advice", () => {
  it("gives a minute and a half per question, ten minutes at least", () => {
    expect(mockTimeLimitMinutes(4)).toBe(10);
    expect(mockTimeLimitMinutes(30)).toBe(45);
    expect(mockTimeLimitMinutes(31)).toBe(47);
  });

  it("prints the clock in minutes and seconds, a second begun counted whole, never below zero", () => {
    expect(mockClock(10 * 60_000)).toBe("10:00");
    expect(mockClock(61_500)).toBe("01:02");
    expect(mockClock(MOCK_LAST_MINUTE_MS - 1)).toBe("01:00");
    expect(mockClock(0)).toBe("00:00");
    expect(mockClock(-5_000)).toBe("00:00");
    expect(MOCK_LAST_MINUTE_MS).toBe(60_000);
  });

  it("names a domain's state and the ones to go back to", () => {
    expect([domainVerdict(85), domainVerdict(60), domainVerdict(20)]).toEqual([
      "acquis",
      "à consolider",
      "à revoir",
    ]);
    const weakest = weakestDomains([
      { domain: "A", correct: 3, total: 3, percent: 100 },
      { domain: "B", correct: 1, total: 3, percent: 33 },
      { domain: "C", correct: 0, total: 2, percent: 0 },
      { domain: "D", correct: 2, total: 3, percent: 67 },
    ]);
    expect(weakest.map((d) => d.domain)).toEqual(["C", "B"]);
  });
});

describe("verdicts and advice", () => {
  it("gives each verdict its tone, on the verdict's own thresholds", () => {
    expect([verdictTone(80), verdictTone(79), verdictTone(50), verdictTone(49)]).toEqual([
      "ok",
      "mid",
      "mid",
      "low",
    ]);
  });

  it('names the modules to go back to with " et ", or says none needs it', () => {
    expect(
      mockAdvice([
        { domain: "Fichiers, droits", correct: 0, total: 3, percent: 0 },
        { domain: "Réseau", correct: 1, total: 3, percent: 33 },
        { domain: "Shell", correct: 3, total: 3, percent: 100 },
      ]),
    ).toBe("À revoir en premier : Fichiers, droits et Réseau.");
    expect(mockAdvice([{ domain: "Shell", correct: 3, total: 3, percent: 100 }])).toBe(
      "Tous les modules au-dessus de 70 % : tu es prêt pour l'examen final.",
    );
  });
});

describe("the paper", () => {
  const questions: MockQuestion[] = [
    { index: 0, domain: "Les fichiers", question: "a ?", options: ["A", "B"] },
    { index: 1, domain: "Les fichiers", question: "b ?", options: ["A", "B"] },
    { index: 2, domain: "Les droits", question: "c ?", options: ["A", "B"] },
  ];

  it("cuts the questions into their modules, in the drawn order", () => {
    expect(mockParts(questions).map((p) => [p.domain, p.questions.map((q) => q.index)])).toEqual([
      ["Les fichiers", [0, 1]],
      ["Les droits", [2]],
    ]);
    expect(mockParts([])).toEqual([]);
  });

  it("lists the questions still blank, an answer of 0 being an answer", () => {
    expect(unansweredQuestions(questions, { "0": 0, "2": 1 }).map((q) => q.index)).toEqual([1]);
    expect(unansweredQuestions(questions, {})).toHaveLength(3);
  });
});

describe("the copy handed in", () => {
  it("tells a blank from a wrong answer, and counts them", () => {
    const refs = [
      { lessonId: "l1", quizId: "q1", domain: "Les fichiers", order: [0, 1, 2, 3] },
      { lessonId: "l2", quizId: "q1", domain: "Les fichiers", order: [0, 1, 2, 3] },
      { lessonId: "l3", quizId: "q1", domain: "Les droits", order: [0, 1, 2, 3] },
    ];
    const { review } = scoreMockExam(refs, byKey, { "0": 1, "1": 2 });
    expect(review.map(answerState)).toEqual(["right", "wrong", "blank"]);
    expect(review.map((item) => ANSWER_WORD[answerState(item)])).toEqual([
      "Juste",
      "Fausse",
      "Sans réponse",
    ]);
    expect(answerCounts(review)).toEqual({ right: 1, wrong: 1, blank: 1 });
    expect(answerCounts([])).toEqual({ right: 0, wrong: 0, blank: 0 });
  });

  it("tags the option picked and the right one, and leaves the others bare", () => {
    const options = [0, 1, 2];
    expect(options.map((k) => optionTag({ correct: 1, selected: 1 }, k))).toEqual([
      null,
      "Ta réponse, juste",
      null,
    ]);
    expect(options.map((k) => optionTag({ correct: 1, selected: 2 }, k))).toEqual([
      null,
      "Bonne réponse",
      "Ta réponse",
    ]);
    expect(options.map((k) => optionTag({ correct: 0, selected: null }, k))).toEqual([
      "Bonne réponse",
      null,
      null,
    ]);
  });

  it("keys the options by letter, by number past Z", () => {
    expect([0, 1, 25, 26].map(optionKey)).toEqual(["A", "B", "Z", "27"]);
  });
});

describe("the history", () => {
  const attempt = (score: number, domains: { domain: string; percent: number }[] = []) => ({
    score,
    domains: domains.map((d) => ({ ...d, correct: 0, total: 3 })),
  });

  it("gives the best score from two attempts on", () => {
    expect(bestScore([])).toBeNull();
    expect(bestScore([attempt(40)])).toBeNull();
    expect(bestScore([attempt(40), attempt(85), attempt(60)])).toBe(85);
  });

  it("reads each module's score off the newest attempt only", () => {
    const last = lastDomainScores([
      attempt(50, [{ domain: "Les fichiers", percent: 33 }]),
      attempt(90, [
        { domain: "Les fichiers", percent: 100 },
        { domain: "Les droits", percent: 100 },
      ]),
    ]);
    expect([...last.keys()]).toEqual(["Les fichiers"]);
    expect(last.get("Les fichiers")?.percent).toBe(33);
    expect(lastDomainScores([]).size).toBe(0);
  });
});
