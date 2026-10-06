import { describe, expect, it } from "vitest";
import { randomFromText } from "../exercises/arrange";
import {
  clientQuestions,
  domainVerdict,
  domainsOf,
  drawMockExam,
  mockTimeLimitMinutes,
  scoreMockExam,
  sourceKey,
  weakestDomains,
  type MockSource,
} from "./mock";

/**
 * A mock exam over a small path: a few questions from each module, the
 * options shuffled, no answer key in what is shown, a score per domain, a
 * question that left its lesson left out of the count, and the advice.
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
