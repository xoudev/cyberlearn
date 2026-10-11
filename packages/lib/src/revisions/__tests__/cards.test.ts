import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clientQuestions, sourceKey, type MockSource } from "../../exam/mock.js";
import {
  answerCard,
  CARD_SESSION_PER_LESSON,
  CARD_SESSION_SIZE,
  cardsForCompletion,
  daysForBox,
  drawReviewSession,
  dueAfter,
  dueCutoff,
  gradeReviewSession,
  isReviewableLesson,
  isStale,
  orphanCards,
  pickSessionCards,
  prioritizeCards,
  readDraw,
  readSessionAnswers,
  staleBefore,
  type DueCard,
} from "../cards.js";

// 10:00 in Paris on Sunday 11 October 2026.
const NOW = new Date("2026-10-11T08:00:00Z");
const day = (key: string): Date => new Date(`${key}T00:00:00Z`);

describe("due dates", () => {
  it("count calendar days from the day of now, whatever its hour", () => {
    expect(dueAfter(NOW, 1)).toEqual(day("2026-10-12"));
    expect(dueAfter(new Date("2026-10-11T21:59:00Z"), 1)).toEqual(day("2026-10-12"));
    expect(dueCutoff(NOW)).toEqual(day("2026-10-11"));
  });

  it("follow the platform's day, not UTC's: half past midnight in Paris is already the next day", () => {
    const lateEvening = new Date("2026-10-11T22:30:00Z");
    expect(dueCutoff(lateEvening)).toEqual(day("2026-10-12"));
    expect(dueAfter(lateEvening, 1)).toEqual(day("2026-10-13"));
  });

  it("put a card due tomorrow in tomorrow's session, however early it is drawn", () => {
    const due = dueAfter(new Date("2026-10-11T21:00:00Z"), 1);
    const justAfterMidnight = new Date("2026-10-11T22:05:00Z");
    expect(due.getTime()).toBeLessThanOrEqual(dueCutoff(justAfterMidnight).getTime());
  });
});

describe("daysForBox", () => {
  it("waits 1, 3, 7 then 21 days", () => {
    expect([1, 2, 3, 4].map(daysForBox)).toEqual([1, 3, 7, 21]);
  });

  it("reads a box out of range as the nearest one", () => {
    expect(daysForBox(0)).toBe(1);
    expect(daysForBox(9)).toBe(21);
  });
});

describe("answerCard", () => {
  const card = { box: 1, dueAt: day("2026-10-11"), lapses: 0 };

  it("moves a card up a box on a right answer, due again after that box's wait", () => {
    expect(answerCard(card, true, NOW)).toEqual({
      box: 2,
      dueAt: day("2026-10-14"),
      lapses: 0,
      lastAnsweredAt: NOW,
      retiredAt: null,
    });
    expect(answerCard({ ...card, box: 2 }, true, NOW).dueAt).toEqual(day("2026-10-18"));
    expect(answerCard({ ...card, box: 3 }, true, NOW).dueAt).toEqual(day("2026-11-01"));
  });

  it("retires a card answered right in the last box, leaving its due date as it was", () => {
    expect(answerCard({ ...card, box: 4 }, true, NOW)).toEqual({
      box: 4,
      dueAt: day("2026-10-11"),
      lapses: 0,
      lastAnsweredAt: NOW,
      retiredAt: NOW,
    });
  });

  it("sends a card back to the first box on a wrong answer, with one more lapse", () => {
    expect(answerCard({ box: 3, dueAt: day("2026-10-11"), lapses: 2 }, false, NOW)).toEqual({
      box: 1,
      dueAt: day("2026-10-12"),
      lapses: 3,
      lastAnsweredAt: NOW,
      retiredAt: null,
    });
  });

  it("takes four right answers from a missed question to its retirement", () => {
    let state = { box: 1, dueAt: day("2026-10-12"), lapses: 0 };
    let at = new Date("2026-10-12T08:00:00Z");
    const waits: number[] = [];
    for (let i = 0; i < 4; i++) {
      const next = answerCard(state, true, at);
      if (next.retiredAt !== null) break;
      waits.push(Math.round((next.dueAt.getTime() - day("2026-10-12").getTime()) / 86_400_000));
      state = next;
      at = new Date(next.dueAt.getTime() + 8 * 3_600_000);
    }
    // Due on the 12th; then 3, 3 + 7 and 3 + 7 + 21 days after it.
    expect(waits).toEqual([3, 10, 31]);
    expect(answerCard(state, true, at).retiredAt).toEqual(at);
  });
});

describe("isStale", () => {
  it("retires a card more than thirty days overdue after a right answer", () => {
    expect(staleBefore(NOW)).toEqual(day("2026-09-11"));
    const overdue = { box: 2, dueAt: day("2026-09-10"), retiredAt: null };
    expect(isStale(overdue, NOW)).toBe(true);
  });

  it("keeps one exactly thirty days overdue", () => {
    expect(isStale({ box: 2, dueAt: day("2026-09-11"), retiredAt: null }, NOW)).toBe(false);
  });

  it("keeps a question last answered wrong, however long it waited", () => {
    expect(isStale({ box: 1, dueAt: day("2026-01-01"), retiredAt: null }, NOW)).toBe(false);
  });

  it("leaves a retired card alone", () => {
    expect(isStale({ box: 4, dueAt: day("2026-01-01"), retiredAt: NOW }, NOW)).toBe(false);
  });
});

describe("orphanCards", () => {
  it("finds the cards whose question is gone from a lesson read, and only those", () => {
    const cards = [
      { id: "a", lessonId: "l1", quizId: "q-1" },
      { id: "b", lessonId: "l1", quizId: "q-gone" },
      { id: "c", lessonId: "l2", quizId: "q-1" },
    ];
    const quizIds = new Map([["l1", new Set(["q-1", "q-2"])]]);
    expect(orphanCards(cards, quizIds).map((card) => card.id)).toEqual(["b"]);
  });

  it("retires every card of a lesson that has no quiz left", () => {
    const cards = [{ id: "a", lessonId: "l1", quizId: "q-1" }];
    expect(orphanCards(cards, new Map([["l1", new Set<string>()]]))).toEqual(cards);
  });
});

describe("isReviewableLesson", () => {
  const lesson = (slug: string, title: string, audience = "CATALOGUE") => ({
    slug,
    title,
    audience,
  });

  it("keeps an ordinary lesson", () => {
    expect(isReviewableLesson(lesson("linux-permissions", "Les permissions"))).toBe(true);
    // A title that speaks of a project is not a project.
    expect(isReviewableLesson(lesson("grc-pilotage", "Piloter un projet de sécurité"))).toBe(true);
  });

  it("leaves out the module reviews", () => {
    expect(
      isReviewableLesson(
        lesson("linux-bilan-module-1", "Bilan du module 1 : ton environnement de travail"),
      ),
    ).toBe(false);
    expect(
      isReviewableLesson(
        lesson("fondamentaux-bilan-module-7", "Bilan du module 7 : l'audit de ta sécurité"),
      ),
    ).toBe(false);
  });

  it("leaves out the projects, by their title or by their slug", () => {
    expect(
      isReviewableLesson(lesson("asm-projet", "Projet : une calculatrice en assembleur")),
    ).toBe(false);
    // The fundamentals path's final project says so in its title only.
    expect(
      isReviewableLesson(lesson("fondamentaux-le-cahier-des-charges", "Projet final : le cahier")),
    ).toBe(false);
    expect(isReviewableLesson(lesson("linux-projet-durcir", "Durcir le serveur"))).toBe(false);
  });

  it("leaves out a lesson written for a class", () => {
    expect(isReviewableLesson(lesson("ma-lecon", "Les réseaux", "CLASS"))).toBe(false);
  });
});

describe("isReviewableLesson, over the catalogue", () => {
  // The rule reads names, so it is checked against every lesson written.
  const CONTENT = path.resolve(__dirname, "../../../../../content");

  interface WrittenLesson {
    file: string;
    refCode: string;
    slug: string;
    title: string;
  }

  function field(frontmatter: string, name: string): string {
    const line = new RegExp(`^${name}:\\s*(.*)$`, "mu").exec(frontmatter)?.[1] ?? "";
    return line.trim().replace(/^"(.*)"$/u, "$1");
  }

  function writtenLessons(dir = path.join(CONTENT, "lessons")): WrittenLesson[] {
    return readdirSync(dir).flatMap((name): WrittenLesson[] => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return writtenLessons(full);
      if (!name.endsWith(".mdx")) return [];
      const raw = readFileSync(full, "utf8").replace(/\r\n/gu, "\n");
      const frontmatter = /^---\n([\s\S]*?)\n---\n/u.exec(raw)?.[1] ?? "";
      return [
        {
          file: name,
          refCode: field(frontmatter, "refCode"),
          slug: field(frontmatter, "slug"),
          title: field(frontmatter, "title"),
        },
      ];
    });
  }

  /** The refCodes filed under a path's final project module. */
  function finalProjectSteps(): Set<string> {
    const dir = path.join(CONTENT, "paths");
    const refs = readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .flatMap((name) => {
        const manifest: unknown = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
        // SAFETY: a path manifest; its shape is checked by path-manifests.test.ts.
        const modules = (manifest as { modules?: { title: string; lessons: string[] }[] }).modules;
        return (modules ?? [])
          .filter((module) => module.title === "Projet de fin de parcours")
          .flatMap((module) => module.lessons);
      });
    return new Set(refs);
  }

  const lessons = writtenLessons().filter((l) => l.slug !== "" && l.title !== "");
  const reviewable = (l: WrittenLesson): boolean =>
    isReviewableLesson({ slug: l.slug, title: l.title, audience: "CATALOGUE" });

  it("leaves out every module review", () => {
    // A module review is numbered 901 and up within its path (01901-…, 02905-…).
    const reviews = lessons.filter((l) => /^\d{2}9\d{2}-/u.test(l.file));
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews.filter(reviewable).map((l) => l.slug)).toEqual([]);
  });

  it("leaves out every step of a path's final project", () => {
    const steps = finalProjectSteps();
    const written = lessons.filter((l) => steps.has(l.refCode));
    expect(written.length).toBeGreaterThan(0);
    expect(written.filter(reviewable).map((l) => l.slug)).toEqual([]);
  });

  it("leaves out nothing but module reviews and projects", () => {
    const leftOut = lessons.filter((l) => !reviewable(l));
    expect(leftOut.filter((l) => !/^(Bilan du module|Projet)\b/u.test(l.title))).toEqual([]);
  });
});

describe("cardsForCompletion", () => {
  const quizIds = ["q-1", "q-2", "q-3", "q-4", "q-5"];

  it("enqueues the questions missed for the next day and the last one right for a week later", () => {
    const cards = cardsForCompletion(
      quizIds,
      [
        { quizId: "q-1", correct: true },
        { quizId: "q-2", correct: false },
        { quizId: "q-3", correct: true },
        { quizId: "q-4", correct: false },
      ],
      NOW,
    );
    expect(cards).toEqual([
      { quizId: "q-2", box: 1, dueAt: day("2026-10-12") },
      { quizId: "q-4", box: 1, dueAt: day("2026-10-12") },
      { quizId: "q-3", box: 3, dueAt: day("2026-10-18") },
    ]);
  });

  it("brings back one question of a lesson passed without a miss", () => {
    const answers = quizIds.map((quizId) => ({ quizId, correct: true }));
    expect(cardsForCompletion(quizIds, answers, NOW)).toEqual([
      { quizId: "q-5", box: 3, dueAt: day("2026-10-18") },
    ]);
  });

  it("gives the same cards for the same answers, in whatever order they were recorded", () => {
    const answers = [
      { quizId: "q-4", correct: true },
      { quizId: "q-1", correct: false },
      { quizId: "q-2", correct: true },
    ];
    const once = cardsForCompletion(quizIds, answers, NOW);
    expect(cardsForCompletion(quizIds, [...answers].reverse(), NOW)).toEqual(once);
    expect(once.map((card) => card.quizId)).toEqual(["q-1", "q-4"]);
  });

  it("ignores an answer to a quiz the lesson no longer has, and a quiz never answered", () => {
    const cards = cardsForCompletion(
      ["q-1", "q-2"],
      [
        { quizId: "q-old", correct: false },
        { quizId: "q-1", correct: false },
      ],
      NOW,
    );
    expect(cards.map((card) => card.quizId)).toEqual(["q-1"]);
  });

  it("enqueues nothing when nothing was answered", () => {
    expect(cardsForCompletion(quizIds, [], NOW)).toEqual([]);
    expect(cardsForCompletion([], [{ quizId: "q-1", correct: false }], NOW)).toEqual([]);
  });
});

function due(id: string, lessonId: string, dueKey: string, box = 1): DueCard {
  return { id, lessonId, quizId: `q-${id}`, box, dueAt: day(dueKey) };
}

describe("prioritizeCards", () => {
  it("takes the most overdue first, and among equals the lowest box", () => {
    const ordered = prioritizeCards([
      due("fresh", "l1", "2026-10-11"),
      due("old-high", "l1", "2026-10-01", 3),
      due("old-low", "l2", "2026-10-01", 1),
      due("oldest", "l3", "2026-09-20", 2),
    ]);
    expect(ordered.map((card) => card.id)).toEqual(["oldest", "old-low", "old-high", "fresh"]);
  });
});

describe("pickSessionCards", () => {
  it("asks for six at most", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      due(String(i), `l${String(i)}`, `2026-10-0${String((i % 9) + 1)}`),
    );
    expect(pickSessionCards(cards)).toHaveLength(CARD_SESSION_SIZE);
  });

  it("takes two at most from one lesson, and fills the session from the others", () => {
    const cards = [
      due("a1", "a", "2026-10-01"),
      due("a2", "a", "2026-10-02"),
      due("a3", "a", "2026-10-03"),
      due("a4", "a", "2026-10-04"),
      due("b1", "b", "2026-10-05"),
      due("c1", "c", "2026-10-06"),
    ];
    const picked = pickSessionCards(cards);
    expect(picked.map((card) => card.id)).toEqual(["a1", "a2", "b1", "c1"]);
    expect(picked.filter((card) => card.lessonId === "a")).toHaveLength(CARD_SESSION_PER_LESSON);
  });

  it("asks for nothing when nothing is due", () => {
    expect(pickSessionCards([])).toEqual([]);
  });
});

function source(lessonId: string, quizId: string, options: string[], correct = 0): MockSource {
  return {
    lessonId,
    quizId,
    domain: `Leçon ${lessonId}`,
    question: `Question ${quizId} ?`,
    options,
    correct,
    explanation: null,
  };
}

function sourcesOf(...list: MockSource[]): Map<string, MockSource> {
  return new Map(list.map((s) => [sourceKey(s.lessonId, s.quizId), s]));
}

describe("drawReviewSession", () => {
  const USER = "11111111-1111-4111-8111-111111111111";
  const OPTIONS = ["Lecture", "Écriture", "Exécution", "Aucune des trois"];
  const cards = [
    due("1", "l1", "2026-10-01"),
    due("2", "l1", "2026-10-02"),
    due("3", "l2", "2026-10-03"),
  ];
  const sources = sourcesOf(
    source("l1", "q-1", OPTIONS, 1),
    source("l1", "q-2", ["Oui", "Non"]),
    source("l2", "q-3", ["A", "B", "C"], 2),
  );

  it("draws the cards in priority order, with their lesson as domain and an option order", () => {
    const draw = drawReviewSession(cards, sources, USER, "2026-10-11");
    expect(draw.map((ref) => ref.cardId)).toEqual(["1", "2", "3"]);
    expect(draw[0]?.domain).toBe("Leçon l1");
    for (const ref of draw) {
      const options = sources.get(sourceKey(ref.lessonId, ref.quizId))?.options ?? [];
      expect([...ref.order].sort((a, b) => a - b)).toEqual(options.map((_, k) => k));
    }
  });

  it("leaves out a card whose question the lesson no longer has, and draws another", () => {
    const withGone = [due("gone", "l3", "2026-09-01"), ...cards];
    const draw = drawReviewSession(withGone, sources, USER, "2026-10-11");
    expect(draw.map((ref) => ref.cardId)).toEqual(["1", "2", "3"]);
  });

  it("draws the same order twice on a day, and shuffles again another day", () => {
    const first = drawReviewSession(cards, sources, USER, "2026-10-11");
    expect(drawReviewSession(cards, sources, USER, "2026-10-11")).toEqual(first);
    const orders = new Set(
      ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"].map(
        (key) => JSON.stringify(drawReviewSession(cards, sources, USER, key)[0]?.order),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("keeps an option that refers to the others in its place", () => {
    for (const key of ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"]) {
      expect(drawReviewSession(cards, sources, USER, key)[0]?.order[3]).toBe(3);
    }
  });

  it("shows the questions without their answer key", () => {
    const draw = drawReviewSession(cards, sources, USER, "2026-10-11");
    const questions = clientQuestions(draw, sources);
    expect(questions).toHaveLength(3);
    expect(Object.keys(questions[0] ?? {})).not.toContain("correct");
  });
});

describe("gradeReviewSession", () => {
  const USER = "11111111-1111-4111-8111-111111111111";
  const cards = [
    due("1", "l1", "2026-10-01"),
    due("2", "l2", "2026-10-02"),
    due("3", "l3", "2026-10-03"),
  ];
  const sources = sourcesOf(
    source("l1", "q-1", ["A", "B", "C"], 1),
    source("l2", "q-2", ["A", "B"], 0),
    source("l3", "q-3", ["A", "B"], 1),
  );
  const draw = drawReviewSession(cards, sources, USER, "2026-10-11");
  const shownRight = (index: number): number => {
    const ref = draw[index];
    const correct =
      ref === undefined ? -1 : (sources.get(sourceKey(ref.lessonId, ref.quizId))?.correct ?? -1);
    return ref?.order.indexOf(correct) ?? -1;
  };

  it("checks each answer against the lesson, in the order shown", () => {
    const right = shownRight(0);
    const wrong = shownRight(1) === 0 ? 1 : 0;
    const verdicts = gradeReviewSession(draw, sources, { "0": right, "1": wrong });
    expect(verdicts).toEqual([
      { cardId: "1", lessonId: "l1", quizId: "q-1", correct: true, correctIndex: right },
      { cardId: "2", lessonId: "l2", quizId: "q-2", correct: false, correctIndex: shownRight(1) },
    ]);
  });

  it("gives no verdict on a card unanswered, out of range, or whose question went", () => {
    const without = new Map(sources);
    without.delete(sourceKey("l3", "q-3"));
    expect(gradeReviewSession(draw, without, { "1": 7, "2": 0 })).toEqual([]);
  });
});

describe("reading a session back", () => {
  it("reads a stored draw back as it was written", () => {
    const draw = [{ cardId: "c", lessonId: "l", quizId: "q", domain: "Leçon", order: [1, 0] }];
    expect(readDraw(JSON.parse(JSON.stringify(draw)))).toEqual(draw);
  });

  it("drops what is not a drawn card", () => {
    expect(readDraw(null)).toEqual([]);
    expect(
      readDraw([
        { cardId: "c", lessonId: "l", quizId: "q", domain: "Leçon", order: ["0"] },
        { lessonId: "l", quizId: "q", domain: "Leçon", order: [0] },
        "x",
      ]),
    ).toEqual([]);
  });

  it("reads the answers, drawn index to the option picked, and nothing else", () => {
    expect(readSessionAnswers({ "0": 2, "1": 0, x: 1, "2": "1", "3": 1.5 })).toEqual({
      "0": 2,
      "1": 0,
    });
    expect(readSessionAnswers([1, 2])).toEqual({});
    expect(readSessionAnswers(null)).toEqual({});
  });
});
