/**
 * The conversion of the SM-2 review queue into review cards: which rows give
 * cards and which, when they are due, and that a second run writes nothing.
 * The planning is pure; the run is checked against an in-memory fake of the
 * few Prisma calls it makes.
 */

import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { CARD_FIRST_BOX, CARD_KEPT_RIGHT_BOX } from "@cyberlearn/lib/revisions/cards";
import {
  CONVERSION_SPREAD_DAYS,
  backfillReviewCards,
  boxForSchedule,
  conversionDueDates,
  conversionLesson,
  parseBackfillArgs,
  planUserConversion,
  type ConversionLesson,
  type ConversionLessonRow,
  type ScheduleRow,
} from "../backfill-review-cards.js";

// 10:00 in Paris on 17 October 2026.
const NOW = new Date("2026-10-17T08:00:00.000Z");
const day = (key: string): Date => new Date(`${key}T00:00:00Z`);

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

function quizMdx(...ids: string[]): string {
  return [
    "# Leçon",
    "",
    ...ids.map(
      (id) => `<Quiz id="${id}" question="Pourquoi ?" options={["a", "b"]} correct={1} />`,
    ),
    "",
  ].join("\n");
}

function lessonRow(overrides: Partial<ConversionLessonRow> & { id: string }): ConversionLessonRow {
  return {
    slug: `lecon-${overrides.id}`,
    title: "Les ports TCP",
    audience: "CATALOGUE",
    status: "PUBLISHED",
    contentMdx: quizMdx("q-1", "q-2", "q-3"),
    ...overrides,
  };
}

function schedule(lessonId: string, overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    lessonId,
    nextReviewAt: new Date("2026-10-10T09:00:00.000Z"),
    intervalDays: 1,
    repetitions: 0,
    ...overrides,
  };
}

function lessonMap(...rows: ConversionLessonRow[]): Map<string, ConversionLesson> {
  return new Map(rows.map((row) => [row.id, conversionLesson(row)]));
}

describe("conversionLesson", () => {
  it("reads a published lesson's quiz ids in order", () => {
    expect(conversionLesson(lessonRow({ id: "l1" }))).toEqual({
      id: "l1",
      slug: "lecon-l1",
      published: true,
      reviewable: true,
      quizIds: ["q-1", "q-2", "q-3"],
    });
  });

  it("marks module reviews, projects and class lessons as giving no cards", () => {
    const bilan = conversionLesson(lessonRow({ id: "l1", title: "Bilan du module 3 : réseau" }));
    const projet = conversionLesson(lessonRow({ id: "l2", slug: "linux-projet-durcir" }));
    const classe = conversionLesson(lessonRow({ id: "l3", audience: "CLASS" }));
    for (const lesson of [bilan, projet, classe]) {
      expect(lesson.reviewable).toBe(false);
      expect(lesson.quizIds).toEqual([]);
    }
  });

  it("reads a draft or archived lesson as unpublished, and MDX that does not parse as no quiz", () => {
    expect(conversionLesson(lessonRow({ id: "l1", status: "DRAFT" })).published).toBe(false);
    expect(conversionLesson(lessonRow({ id: "l2", status: "ARCHIVED" })).published).toBe(false);
    expect(conversionLesson(lessonRow({ id: "l3", contentMdx: "<Quiz id=" })).quizIds).toEqual([]);
  });
});

describe("boxForSchedule", () => {
  it("maps the SM-2 interval reached to the last box whose wait it reached", () => {
    expect(boxForSchedule({ intervalDays: 1, repetitions: 0 })).toBe(1);
    expect(boxForSchedule({ intervalDays: 1, repetitions: 1 })).toBe(1);
    expect(boxForSchedule({ intervalDays: 6, repetitions: 2 })).toBe(2);
    expect(boxForSchedule({ intervalDays: 15, repetitions: 3 })).toBe(3);
    expect(boxForSchedule({ intervalDays: 38, repetitions: 4 })).toBe(4);
    expect(boxForSchedule({ intervalDays: 400, repetitions: 9 })).toBe(4);
  });

  it("starts a lesson never recalled in the first box, whatever its interval says", () => {
    expect(boxForSchedule({ intervalDays: 15, repetitions: 0 })).toBe(CARD_FIRST_BOX);
  });
});

describe("conversionDueDates", () => {
  it("spreads the lessons due already over the spread days, the most overdue first", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      schedule(`lesson-${String(i).padStart(2, "0")}`, {
        nextReviewAt: new Date(Date.UTC(2026, 8, 1 + i, 9)),
      }),
    );
    const due = conversionDueDates(rows, NOW);

    expect(due.get("lesson-00")).toEqual(day("2026-10-17"));
    expect(due.get("lesson-01")).toEqual(day("2026-10-18"));
    expect(due.get("lesson-04")).toEqual(day("2026-10-21"));
    expect(due.get("lesson-05")).toEqual(day("2026-10-17"));

    const perDay = new Map<number, number>();
    for (const date of due.values()) {
      perDay.set(date.getTime(), (perDay.get(date.getTime()) ?? 0) + 1);
    }
    expect(perDay.size).toBe(CONVERSION_SPREAD_DAYS);
    expect(Math.max(...perDay.values())).toBe(Math.ceil(12 / CONVERSION_SPREAD_DAYS));
  });

  it("never brings a lesson forward from the day the old queue had it due", () => {
    const due = conversionDueDates(
      [
        schedule("overdue", { nextReviewAt: new Date("2026-10-01T09:00:00.000Z") }),
        // 00:30 in Paris on 31 October: that day, not the UTC one.
        schedule("later", { nextReviewAt: new Date("2026-10-30T23:30:00.000Z") }),
      ],
      NOW,
    );
    expect(due.get("overdue")).toEqual(day("2026-10-17"));
    expect(due.get("later")).toEqual(day("2026-10-31"));
  });

  it("gives the same days to the same rows, in whatever order they come", () => {
    const rows = [
      schedule("b", { nextReviewAt: new Date("2026-10-02T09:00:00.000Z") }),
      schedule("a", { nextReviewAt: new Date("2026-10-02T09:00:00.000Z") }),
      schedule("c", { nextReviewAt: new Date("2026-09-20T09:00:00.000Z") }),
    ];
    const forward = conversionDueDates(rows, NOW);
    const backward = conversionDueDates([...rows].reverse(), NOW);
    expect([...backward.entries()].sort()).toEqual([...forward.entries()].sort());
    expect(forward.get("c")).toEqual(day("2026-10-17"));
    expect(forward.get("a")).toEqual(day("2026-10-18"));
    expect(forward.get("b")).toEqual(day("2026-10-19"));
  });
});

describe("planUserConversion", () => {
  it("enqueues the questions missed and the last one answered right, all due the same day", () => {
    const [plan] = planUserConversion(
      [schedule("l1")],
      lessonMap(lessonRow({ id: "l1" })),
      new Map([
        [
          "l1",
          [
            { quizId: "q-1", correct: true },
            { quizId: "q-2", correct: false },
            { quizId: "q-3", correct: true },
          ],
        ],
      ]),
      new Set(),
      NOW,
    );
    expect(plan).toEqual({
      lessonId: "l1",
      outcome: "fromAnswers",
      cards: [
        { quizId: "q-2", box: CARD_FIRST_BOX, dueAt: day("2026-10-17"), everCorrect: false },
        { quizId: "q-3", box: CARD_KEPT_RIGHT_BOX, dueAt: day("2026-10-17"), everCorrect: true },
      ],
    });
  });

  it("ignores answers to quizzes the lesson no longer has", () => {
    const [plan] = planUserConversion(
      [schedule("l1")],
      lessonMap(lessonRow({ id: "l1" })),
      new Map([
        [
          "l1",
          [
            { quizId: "q-gone", correct: false },
            { quizId: "q-1", correct: true },
          ],
        ],
      ]),
      new Set(),
      NOW,
    );
    expect(plan?.outcome).toBe("fromAnswers");
    expect(plan?.cards.map((card) => card.quizId)).toEqual(["q-1"]);
  });

  it("with no answer on record, enqueues the lesson's last question in the box the interval reached", () => {
    const [plan] = planUserConversion(
      [schedule("l1", { intervalDays: 15, repetitions: 3 })],
      lessonMap(lessonRow({ id: "l1" })),
      // Only answers to a quiz since removed: as good as none.
      new Map([["l1", [{ quizId: "q-gone", correct: false }]]]),
      new Set(),
      NOW,
    );
    expect(plan).toEqual({
      lessonId: "l1",
      outcome: "fromSchedule",
      cards: [{ quizId: "q-3", box: 3, dueAt: day("2026-10-17"), everCorrect: false }],
    });
  });

  it("leaves alone a lesson the learner has cards for already", () => {
    const [plan] = planUserConversion(
      [schedule("l1")],
      lessonMap(lessonRow({ id: "l1" })),
      new Map(),
      new Set(["l1"]),
      NOW,
    );
    expect(plan).toEqual({ lessonId: "l1", outcome: "alreadyConverted", cards: [] });
  });

  it("gives no card for a lesson unpublished, not reviewable, without quiz or gone", () => {
    const plan = planUserConversion(
      [schedule("draft"), schedule("bilan"), schedule("empty"), schedule("missing")],
      lessonMap(
        lessonRow({ id: "draft", status: "DRAFT" }),
        lessonRow({ id: "bilan", slug: "linux-bilan-module-3" }),
        lessonRow({ id: "empty", contentMdx: "# Rien à demander" }),
      ),
      new Map(),
      new Set(),
      NOW,
    );
    expect(plan.map(({ lessonId, outcome, cards }) => [lessonId, outcome, cards.length])).toEqual([
      ["draft", "unpublished", 0],
      ["bilan", "notReviewable", 0],
      ["empty", "noQuiz", 0],
      ["missing", "unpublished", 0],
    ]);
  });

  it("spreads only the lessons that give cards", () => {
    const plan = planUserConversion(
      [
        schedule("skipped", { nextReviewAt: new Date("2026-09-01T09:00:00.000Z") }),
        schedule("l1", { nextReviewAt: new Date("2026-09-02T09:00:00.000Z") }),
        schedule("l2", { nextReviewAt: new Date("2026-09-03T09:00:00.000Z") }),
      ],
      lessonMap(lessonRow({ id: "l1" }), lessonRow({ id: "l2" })),
      new Map(),
      new Set(["skipped"]),
      NOW,
    );
    expect(plan.map((p) => p.cards[0]?.dueAt)).toEqual([
      undefined,
      day("2026-10-17"),
      day("2026-10-18"),
    ]);
  });
});

describe("parseBackfillArgs", () => {
  it("is a dry run unless --apply is given", () => {
    expect(parseBackfillArgs([])).toEqual({ ok: true, apply: false, verbose: false });
    expect(parseBackfillArgs(["--dry-run"])).toEqual({ ok: true, apply: false, verbose: false });
    expect(parseBackfillArgs(["--", "--apply", "--verbose"])).toEqual({
      ok: true,
      apply: true,
      verbose: true,
    });
  });

  it("refuses both modes at once and anything it does not know", () => {
    expect(parseBackfillArgs(["--apply", "--dry-run"]).ok).toBe(false);
    expect(parseBackfillArgs(["--aply"])).toEqual({
      ok: false,
      error: "Unknown argument: --aply",
    });
  });
});

// ── The run, against an in-memory fake of the Prisma calls it makes ─────────

interface FakeSchedule extends ScheduleRow {
  userId: string;
}

interface FakeCard {
  userId: string;
  lessonId: string;
  quizId: string;
  box: number;
  dueAt: Date;
  everCorrect: boolean;
}

interface FakeAnswer {
  userId: string;
  lessonId: string;
  quizId: string;
  correct: boolean;
}

interface FakeStore {
  lessons: ConversionLessonRow[];
  schedules: FakeSchedule[];
  cards: FakeCard[];
  answers: FakeAnswer[];
}

interface UserFilter {
  where?: { userId?: { in?: string[] } };
}

function inBatch(args: UserFilter): (row: { userId: string }) => boolean {
  const ids = new Set(args.where?.userId?.in ?? []);
  return (row) => ids.has(row.userId);
}

function makeFakeDb(store: FakeStore): PrismaClient {
  const db = {
    lesson: { findMany: () => Promise.resolve(store.lessons.map((row) => ({ ...row }))) },
    reviewSchedule: {
      findMany: (args: UserFilter & { distinct?: string[] }) => {
        if (args.distinct !== undefined) {
          const ids = [...new Set(store.schedules.map((row) => row.userId))].sort();
          return Promise.resolve(ids.map((userId) => ({ userId })));
        }
        return Promise.resolve(store.schedules.filter(inBatch(args)).map((row) => ({ ...row })));
      },
    },
    reviewCard: {
      findMany: (args: UserFilter) => {
        const pairs = new Map<string, { userId: string; lessonId: string }>();
        for (const card of store.cards.filter(inBatch(args))) {
          pairs.set(`${card.userId}:${card.lessonId}`, {
            userId: card.userId,
            lessonId: card.lessonId,
          });
        }
        return Promise.resolve([...pairs.values()]);
      },
      createMany: ({ data }: { data: FakeCard[]; skipDuplicates: boolean }) => {
        let count = 0;
        for (const card of data) {
          const taken = store.cards.some(
            (c) =>
              c.userId === card.userId && c.lessonId === card.lessonId && c.quizId === card.quizId,
          );
          if (taken) continue;
          store.cards.push({ ...card });
          count += 1;
        }
        return Promise.resolve({ count });
      },
    },
    lessonQuizAnswer: {
      findMany: (args: UserFilter) =>
        Promise.resolve(store.answers.filter(inBatch(args)).map((row) => ({ ...row }))),
    },
  };
  // SAFETY: the fake implements exactly the Prisma subset backfillReviewCards uses.
  return db as unknown as PrismaClient;
}

function fakeStore(): FakeStore {
  return {
    lessons: [
      lessonRow({ id: "l1" }),
      lessonRow({ id: "l2", title: "Projet : un pare-feu" }),
      lessonRow({ id: "l3" }),
    ],
    schedules: [
      { userId: USER_A, ...schedule("l1") },
      { userId: USER_A, ...schedule("l2") },
      { userId: USER_B, ...schedule("l1", { intervalDays: 6, repetitions: 2 }) },
      { userId: USER_B, ...schedule("l3") },
    ],
    // USER_B finished l3 since the cards shipped: it has its card already.
    cards: [
      {
        userId: USER_B,
        lessonId: "l3",
        quizId: "q-1",
        box: 1,
        dueAt: day("2026-10-18"),
        everCorrect: false,
      },
    ],
    answers: [
      { userId: USER_A, lessonId: "l1", quizId: "q-1", correct: false },
      { userId: USER_A, lessonId: "l1", quizId: "q-2", correct: true },
    ],
  };
}

describe("backfillReviewCards", () => {
  it("on a dry run, counts what it would write and writes nothing", async () => {
    const store = fakeStore();
    const report = await backfillReviewCards({
      apply: false,
      now: NOW,
      batchSize: 1,
      client: makeFakeDb(store),
    });

    expect(store.cards).toHaveLength(1);
    expect(report).toMatchObject({
      applied: false,
      users: 2,
      schedules: 4,
      outcomes: {
        fromAnswers: 1,
        fromSchedule: 1,
        alreadyConverted: 1,
        unpublished: 0,
        notReviewable: 1,
        noQuiz: 0,
      },
      cardsPlanned: 3,
      cardsCreated: 0,
      dueDays: { "2026-10-17": 3 },
      lastSpreadDay: "2026-10-21",
    });
    expect(report.perUser).toEqual([
      { userId: USER_A, lessons: 1, cards: 2 },
      { userId: USER_B, lessons: 1, cards: 1 },
    ]);
    expect(report.perLesson).toEqual([{ lessonId: "l1", slug: "lecon-l1", learners: 2, cards: 3 }]);
  });

  it("writes the cards, and a second run writes nothing", async () => {
    const store = fakeStore();
    const client = makeFakeDb(store);

    const first = await backfillReviewCards({ apply: true, now: NOW, client });
    expect(first.cardsCreated).toBe(3);
    expect(store.cards).toEqual(
      expect.arrayContaining([
        {
          userId: USER_A,
          lessonId: "l1",
          quizId: "q-1",
          box: CARD_FIRST_BOX,
          dueAt: day("2026-10-17"),
          everCorrect: false,
        },
        {
          userId: USER_A,
          lessonId: "l1",
          quizId: "q-2",
          box: CARD_KEPT_RIGHT_BOX,
          dueAt: day("2026-10-17"),
          everCorrect: true,
        },
        {
          userId: USER_B,
          lessonId: "l1",
          quizId: "q-3",
          box: 2,
          dueAt: day("2026-10-17"),
          everCorrect: false,
        },
      ]),
    );
    expect(store.cards).toHaveLength(4);

    // A day later, with the lesson's MDX changed: still nothing to write.
    const l1 = store.lessons.find((lesson) => lesson.id === "l1");
    if (l1 !== undefined) l1.contentMdx = quizMdx("q-1", "q-2", "q-3", "q-4");
    const second = await backfillReviewCards({
      apply: true,
      now: new Date("2026-10-18T08:00:00.000Z"),
      client,
    });
    expect(second.cardsPlanned).toBe(0);
    expect(second.cardsCreated).toBe(0);
    expect(second.outcomes.alreadyConverted).toBe(3);
    expect(store.cards).toHaveLength(4);
  });
});
