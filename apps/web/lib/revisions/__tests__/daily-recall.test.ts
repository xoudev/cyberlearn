import { beforeEach, describe, expect, it, vi } from "vitest";
import { reviewOptionOrder, type ReviewDrawRef } from "@cyberlearn/lib/revisions/cards";

/**
 * "Rappel du jour" and "Réviser ce module", on the server: drawn once a day
 * and stored, each answer checked against the lesson and final, the last one
 * handing the session in for its XP once; a module's review checked the same
 * way, without anything written.
 */

const m = vi.hoisted(() => ({
  revisionsEnabled: vi.fn<(userId: string) => Promise<boolean>>(),
  recordQuestProgress: vi.fn(),
  creditXp: vi.fn(),
  evaluateAndAwardBadges: vi.fn(),
  findForGamification: vi.fn(),
  findSheetOutline: vi.fn(),
  transaction: vi.fn(),
  userUpdate: vi.fn(),
  activityUpsert: vi.fn(),
  repo: {
    findSession: vi.fn(),
    findDue: vi.fn(),
    findLessons: vi.fn(),
    findCompletedLessons: vi.fn(),
    retire: vi.fn(),
    retireStale: vi.fn(),
    createSession:
      vi.fn<
        (
          userId: string,
          day: string,
          draw: ReviewDrawRef[],
          completedAt?: Date | null,
        ) => Promise<unknown>
      >(),
    answerInSession: vi.fn(),
    applyAnswer: vi.fn(),
    completeSession: vi.fn(),
    claimSessionXp: vi.fn(),
    hasDue: vi.fn(),
    findDueQuestions: vi.fn(),
  },
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: { $transaction: m.transaction },
  pathRepository: { findSheetOutline: m.findSheetOutline },
  reviewCardRepository: m.repo,
  userRepository: { findForGamification: m.findForGamification },
}));
vi.mock("@/lib/lessons/revisions-enabled", () => ({ revisionsEnabled: m.revisionsEnabled }));
vi.mock("@/lib/quests/progress", () => ({ recordQuestProgress: m.recordQuestProgress }));
vi.mock("@/lib/xp/credit", () => ({ creditXp: m.creditXp }));
vi.mock("@/lib/badges/award", () => ({ evaluateAndAwardBadges: m.evaluateAndAwardBadges }));

const {
  answerDailyRecall,
  answerModuleReview,
  dailyRecallState,
  learnersWithRecall,
  openDailyRecall,
  openModuleReview,
} = await import("../daily-recall");

const USER = "11111111-1111-4111-8111-111111111111";
const L1 = "22222222-2222-4222-8222-222222222222";
const L2 = "33333333-3333-4333-8333-333333333333";
const L3 = "44444444-4444-4444-8444-444444444444";
// 10:00 in Paris on Saturday 17 October 2026.
const NOW = new Date("2026-10-17T08:00:00Z");
const DAY = "2026-10-17";

const Q1 = ["rw- --- ---", "rwx --- ---", "r-- r-- r--"];
const Q2 = ["chgrp", "chmod", "passwd"];
const Q3 = ["ls -l", "pwd", "cd"];

const MDX_L1 = [
  "## Les droits",
  "",
  "Du texte.",
  "",
  `<Quiz id="q-1" question="Que donne chmod 600 ?" options={${JSON.stringify(Q1)}} correct={0} explanation="6, c'est lecture et écriture." />`,
  "",
  "## Les groupes",
  "",
  `<Quiz id="q-2" question="Quelle commande change le groupe ?" options={${JSON.stringify(Q2)}} correct={0} />`,
].join("\n");

const MDX_L2 = [
  "## Lister",
  "",
  `<Quiz id="q-3" question="Qui affiche les droits ?" options={${JSON.stringify(Q3)}} correct={0} />`,
].join("\n");

const LESSONS = [
  { id: L1, slug: "linux-droits", title: "Les droits", contentMdx: MDX_L1 },
  { id: L2, slug: "linux-lister", title: "Lister", contentMdx: MDX_L2 },
];

/** A lesson one bad expression keeps from parsing: it yields no quiz, and its cards are kept. */
const BROKEN = {
  id: L3,
  slug: "linux-casse",
  title: "Cassé",
  contentMdx: [
    "## Cassé",
    "",
    "Une accolade { jamais fermée.",
    "",
    `<Quiz id="q-4" question="Qui ?" options={${JSON.stringify(Q3)}} correct={0} />`,
  ].join("\n"),
};

/** A card due since yesterday, as findDue reads it. */
function dueCard(id: string, lessonId: string, quizId: string) {
  return {
    id,
    lessonId,
    quizId,
    box: 1,
    dueAt: new Date("2026-10-16T00:00:00Z"),
    lapses: 0,
    everCorrect: false,
    lesson: { slug: "x", title: "x" },
  };
}

/** createSession as the repository answers it: the session stored, handed in or not. */
function storesSession(): void {
  m.repo.createSession.mockImplementation((_user, _day, draw, completedAt) =>
    Promise.resolve(session({ draw, completedAt: completedAt ?? null })),
  );
}

function ref(lessonId: string, quizId: string, options: string[]): ReviewDrawRef {
  return {
    cardId: `c-${quizId}`,
    lessonId,
    quizId,
    domain: lessonId === L1 ? "Les droits" : "Lister",
    order: reviewOptionOrder(options, USER, lessonId, quizId, DAY),
  };
}

const DRAW = [ref(L1, "q-1", Q1), ref(L1, "q-2", Q2), ref(L2, "q-3", Q3)];

/** The shown index of the right option (written 0 in every quiz here) of a drawn question. */
function right(r: ReviewDrawRef): number {
  return r.order.indexOf(0);
}

function wrong(r: ReviewDrawRef): number {
  return right(r) === 0 ? 1 : 0;
}

function session(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "s1",
    userId: USER,
    day: DAY,
    draw: DRAW,
    answers: {},
    completedAt: null,
    xpCredited: false,
    ...overrides,
  };
}

const tx = { user: { update: m.userUpdate }, userActivityDay: { upsert: m.activityUpsert } };

beforeEach(() => {
  vi.clearAllMocks();
  m.revisionsEnabled.mockResolvedValue(true);
  m.transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
  m.repo.findLessons.mockResolvedValue(LESSONS);
  m.repo.answerInSession.mockResolvedValue(true);
  m.repo.applyAnswer.mockResolvedValue({});
  m.repo.completeSession.mockResolvedValue(true);
  m.repo.claimSessionXp.mockResolvedValue(true);
  m.repo.retire.mockResolvedValue(0);
  m.repo.retireStale.mockResolvedValue(0);
  m.findForGamification.mockResolvedValue({
    xpTotal: 100,
    level: 1,
    streakDays: 3,
    longestStreak: 5,
    streakFreezes: 1,
    lastActiveAt: new Date("2026-10-16T18:00:00Z"),
  });
});

describe("openDailyRecall", () => {
  it("draws nothing once spaced repetition is switched off", async () => {
    m.revisionsEnabled.mockResolvedValue(false);
    const view = await openDailyRecall(USER, NOW);
    expect(view.status).toBe("off");
    expect(m.repo.findSession).not.toHaveBeenCalled();
    expect(m.repo.createSession).not.toHaveBeenCalled();
  });

  it("says so, and stores nothing, when nothing is due", async () => {
    m.repo.findSession.mockResolvedValue(null);
    m.repo.findDue.mockResolvedValue([]);
    const view = await openDailyRecall(USER, NOW);
    expect(view).toMatchObject({ mode: "daily", status: "empty", day: DAY, questions: [] });
    expect(m.repo.createSession).not.toHaveBeenCalled();
  });

  it("draws the day's session on its first opening, retiring the stale and the orphaned cards", async () => {
    m.repo.findSession.mockResolvedValue(null);
    m.repo.findDue.mockResolvedValue([
      dueCard("c-1", L1, "q-1"),
      dueCard("c-gone", L1, "q-gone"),
      dueCard("c-3", L2, "q-3"),
    ]);
    m.repo.createSession.mockImplementation((_user, _day, draw) =>
      Promise.resolve(session({ draw })),
    );

    const view = await openDailyRecall(USER, NOW);

    expect(m.repo.retireStale).toHaveBeenCalledWith(USER, NOW);
    expect(m.repo.retire).toHaveBeenCalledWith(USER, ["c-gone"], NOW);
    const call = m.repo.createSession.mock.calls[0];
    expect(call?.[1]).toBe(DAY);
    expect(call?.[2].map((r) => r.cardId)).toEqual(["c-1", "c-3"]);
    expect(view.status).toBe("open");
    expect(view.questions.map((q) => [q.index, q.lessonTitle, q.question])).toEqual([
      [0, "Les droits", "Que donne chmod 600 ?"],
      [1, "Lister", "Qui affiche les droits ?"],
    ]);
    // No answer key leaves the server.
    for (const q of view.questions) expect(Object.keys(q)).not.toContain("correct");
  });

  it("opens the session already drawn today, with the answers given and their verdicts", async () => {
    const first = DRAW[0];
    if (!first) throw new Error("no draw");
    m.repo.findSession.mockResolvedValue(session({ answers: { "0": right(first) } }));

    const view = await openDailyRecall(USER, NOW);

    expect(m.repo.findDue).not.toHaveBeenCalled();
    expect(view.status).toBe("open");
    expect(view.questions).toHaveLength(3);
    expect(view.verdicts).toEqual([
      {
        index: 0,
        selected: right(first),
        correct: true,
        correctIndex: right(first),
        explanation: "6, c'est lecture et écriture.",
        passage: { lessonTitle: "Les droits", href: "/lessons/linux-droits?section=1#quiz-q-1" },
      },
    ]);
  });

  it("shows the day's recall done, with its score and its XP", async () => {
    const answers = Object.fromEntries(
      DRAW.map((r, i) => [String(i), i === 1 ? wrong(r) : right(r)]),
    );
    m.repo.findSession.mockResolvedValue(session({ answers, completedAt: NOW, xpCredited: true }));
    const view = await openDailyRecall(USER, NOW);
    expect(view.status).toBe("done");
    expect(view.result).toEqual({ correct: 2, total: 3, xp: 15 });
    expect(view.verdicts[1]?.passage?.href).toBe("/lessons/linux-droits?section=2#quiz-q-2");
  });

  it("hands in a session every answer of which was given but not handed in", async () => {
    const answers = Object.fromEntries(DRAW.map((r, i) => [String(i), right(r)]));
    m.repo.findSession
      .mockResolvedValueOnce(session({ answers }))
      .mockResolvedValueOnce(session({ answers, completedAt: NOW, xpCredited: true }));

    const view = await openDailyRecall(USER, NOW);

    expect(m.repo.completeSession).toHaveBeenCalledWith("s1", answers, NOW, tx);
    expect(m.creditXp).toHaveBeenCalledWith(tx, USER, 15, "REVIEW");
    expect(view.status).toBe("done");
  });

  it("asks nothing of cards whose lesson yields no quiz, keeps them, and stores the day so", async () => {
    m.repo.findSession.mockResolvedValue(null);
    m.repo.findDue.mockResolvedValue([dueCard("c-4", L3, "q-4")]);
    m.repo.findLessons.mockResolvedValue([BROKEN]);
    storesSession();

    const view = await openDailyRecall(USER, NOW);

    expect(view).toMatchObject({ status: "empty", questions: [], verdicts: [], result: null });
    // Not retired: the lesson may be mended.
    expect(m.repo.retire).toHaveBeenCalledWith(USER, [], NOW);
    // Stored empty and handed in, so the dashboard and the reminder say the same all day.
    expect(m.repo.createSession).toHaveBeenCalledWith(USER, DAY, [], NOW);
    expect(m.repo.completeSession).not.toHaveBeenCalled();
    expect(m.creditXp).not.toHaveBeenCalled();
  });

  it("says there is nothing to ask on a day stored so, without drawing again", async () => {
    m.repo.findSession.mockResolvedValue(session({ draw: [], completedAt: NOW }));
    const view = await openDailyRecall(USER, NOW);
    expect(view.status).toBe("empty");
    expect(m.repo.findDue).not.toHaveBeenCalled();
    expect(m.repo.completeSession).not.toHaveBeenCalled();
  });
});

describe("answerDailyRecall", () => {
  const [first, second, last] = DRAW;
  if (!first || !second || !last) throw new Error("no draw");

  it("checks the answer against the lesson, records it and moves its card", async () => {
    m.repo.findSession.mockResolvedValue(session());

    const res = await answerDailyRecall(USER, { index: 0, selected: wrong(first) }, NOW);

    expect(res).toEqual({
      ok: true,
      verdict: {
        index: 0,
        selected: wrong(first),
        correct: false,
        correctIndex: right(first),
        explanation: "6, c'est lecture et écriture.",
        passage: { lessonTitle: "Les droits", href: "/lessons/linux-droits?section=1#quiz-q-1" },
      },
      result: null,
    });
    expect(m.repo.answerInSession).toHaveBeenCalledWith(USER, "s1", 0, wrong(first), tx);
    expect(m.repo.applyAnswer).toHaveBeenCalledWith(USER, first, false, NOW, tx);
    expect(m.creditXp).not.toHaveBeenCalled();
  });

  it("hands the session in on its last answer: fifteen XP, the streak and its quest, once", async () => {
    const before = { "0": right(first), "1": right(second) };
    const after = { ...before, "2": wrong(last) };
    m.repo.findSession
      .mockResolvedValueOnce(session({ answers: before }))
      .mockResolvedValueOnce(session({ answers: after }))
      .mockResolvedValueOnce(session({ answers: after, completedAt: NOW, xpCredited: true }));

    const res = await answerDailyRecall(USER, { index: 2, selected: wrong(last) }, NOW);

    expect(res).toMatchObject({ ok: true, result: { correct: 2, total: 3, xp: 15 } });
    expect(m.repo.completeSession).toHaveBeenCalledWith("s1", after, NOW, tx);
    expect(m.repo.claimSessionXp).toHaveBeenCalledWith("s1", tx);
    expect(m.creditXp).toHaveBeenCalledWith(tx, USER, 15, "REVIEW");
    // Active yesterday: the streak goes on to four, and today counts.
    expect(m.userUpdate.mock.calls[0]?.[0]).toMatchObject({
      where: { id: USER },
      data: { streakDays: 4, longestStreak: 5, lastActiveAt: NOW },
    });
    expect(m.activityUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: USER, day: new Date(DAY), count: 1 } }),
    );
    expect(m.recordQuestProgress).toHaveBeenCalledWith(USER, "STREAK_DAYS", NOW, { setTo: 4 });
    expect(m.evaluateAndAwardBadges).toHaveBeenCalledWith(USER, ["DAILY_RECALLS"], { day: DAY });
  });

  it("credits nothing when another tab handed the session in first", async () => {
    const before = { "0": right(first), "1": right(second) };
    const after = { ...before, "2": right(last) };
    m.repo.findSession
      .mockResolvedValueOnce(session({ answers: before }))
      .mockResolvedValueOnce(session({ answers: after }))
      .mockResolvedValueOnce(session({ answers: after, completedAt: NOW, xpCredited: true }));
    m.repo.completeSession.mockResolvedValue(false);

    const res = await answerDailyRecall(USER, { index: 2, selected: right(last) }, NOW);

    expect(m.creditXp).not.toHaveBeenCalled();
    expect(m.recordQuestProgress).not.toHaveBeenCalled();
    expect(m.evaluateAndAwardBadges).not.toHaveBeenCalled();
    // The XP was credited, once, by the other tab: the result says so.
    expect(res).toMatchObject({ ok: true, result: { correct: 3, total: 3, xp: 15 } });
  });

  it("refuses a question answered already, and moves no card", async () => {
    m.repo.findSession.mockResolvedValue(session());
    m.repo.answerInSession.mockResolvedValue(false);
    const res = await answerDailyRecall(USER, { index: 0, selected: 0 }, NOW);
    expect(res).toEqual({ ok: false, error: "Tu as déjà répondu à cette question." });
    expect(m.repo.applyAnswer).not.toHaveBeenCalled();
  });

  it("refuses an answer once the day's recall is handed in", async () => {
    m.repo.findSession.mockResolvedValue(session({ completedAt: NOW }));
    const res = await answerDailyRecall(USER, { index: 0, selected: 0 }, NOW);
    expect(res).toEqual({ ok: false, error: "Tu as déjà fait le rappel du jour." });
    expect(m.repo.answerInSession).not.toHaveBeenCalled();
  });

  it("refuses an answer to a session that is not today's", async () => {
    m.repo.findSession.mockResolvedValue(null);
    const res = await answerDailyRecall(USER, { index: 0, selected: 0 }, NOW);
    expect(res).toMatchObject({ ok: false });
    expect(m.repo.answerInSession).not.toHaveBeenCalled();
  });

  it("refuses what is not an answer, a question not drawn, or an option not shown", async () => {
    m.repo.findSession.mockResolvedValue(session());
    for (const input of [
      null,
      { index: "0", selected: 0 },
      { index: 0 },
      { index: 9, selected: 0 },
    ]) {
      expect(await answerDailyRecall(USER, input, NOW)).toEqual({
        ok: false,
        error: "Réponse invalide.",
      });
    }
    expect(await answerDailyRecall(USER, { index: 0, selected: 5 }, NOW)).toEqual({
      ok: false,
      error: "Réponse invalide.",
    });
    expect(m.repo.answerInSession).not.toHaveBeenCalled();
  });

  it("refuses an answer to a question gone from its lesson since the draw", async () => {
    m.repo.findSession.mockResolvedValue(session());
    m.repo.findLessons.mockResolvedValue([LESSONS[1]]);
    const res = await answerDailyRecall(USER, { index: 0, selected: 0 }, NOW);
    expect(res).toEqual({ ok: false, error: "Cette question n'est plus disponible." });
  });

  it("records nothing once spaced repetition is switched off", async () => {
    m.revisionsEnabled.mockResolvedValue(false);
    const res = await answerDailyRecall(USER, { index: 0, selected: 0 }, NOW);
    expect(res).toMatchObject({ ok: false });
    expect(m.repo.findSession).not.toHaveBeenCalled();
  });
});

describe("dailyRecallState", () => {
  it("is done once the day's session is handed in, to do while it is not", async () => {
    m.repo.findSession.mockResolvedValueOnce(session({ completedAt: NOW }));
    expect(await dailyRecallState(USER, NOW)).toBe("done");
    m.repo.findSession.mockResolvedValueOnce(session());
    expect(await dailyRecallState(USER, NOW)).toBe("todo");
  });

  it("is empty, drawing nothing, when no card is due or spaced repetition is off", async () => {
    m.repo.findSession.mockResolvedValue(null);
    m.repo.hasDue.mockResolvedValueOnce(false);
    expect(await dailyRecallState(USER, NOW)).toBe("empty");
    m.repo.hasDue.mockResolvedValueOnce(true);
    m.revisionsEnabled.mockResolvedValueOnce(false);
    expect(await dailyRecallState(USER, NOW)).toBe("empty");
    expect(m.repo.findDue).not.toHaveBeenCalled();
    expect(m.repo.createSession).not.toHaveBeenCalled();
  });

  it("draws the day when a card is due and nothing was drawn yet: to do, with a question", async () => {
    m.repo.findSession.mockResolvedValue(null);
    m.repo.hasDue.mockResolvedValue(true);
    m.repo.findDue.mockResolvedValue([dueCard("c-1", L1, "q-1")]);
    storesSession();
    expect(await dailyRecallState(USER, NOW)).toBe("todo");
    expect(m.repo.createSession).toHaveBeenCalledWith(
      USER,
      DAY,
      [expect.objectContaining({ cardId: "c-1" })],
      null,
    );
  });

  it("is empty, not to do, when the cards due are in a lesson that yields no quiz", async () => {
    m.repo.findSession.mockResolvedValue(null);
    m.repo.hasDue.mockResolvedValue(true);
    m.repo.findDue.mockResolvedValue([dueCard("c-4", L3, "q-4")]);
    m.repo.findLessons.mockResolvedValue([BROKEN]);
    storesSession();
    expect(await dailyRecallState(USER, NOW)).toBe("empty");

    // Stored so: the next visit reads it back, and draws nothing again.
    m.repo.findSession.mockResolvedValue(session({ draw: [], completedAt: NOW }));
    expect(await dailyRecallState(USER, NOW)).toBe("empty");
    expect(m.repo.createSession).toHaveBeenCalledTimes(1);
  });
});

describe("learnersWithRecall", () => {
  const U2 = "55555555-5555-4555-8555-555555555555";
  const U3 = "66666666-6666-4666-8666-666666666666";

  it("keeps the learners with a card due whose question its lesson has, each lesson read once", async () => {
    m.repo.findDueQuestions.mockResolvedValue([
      { userId: USER, lessonId: L1, quizId: "q-1" },
      // A lesson that yields no quiz: due, never asked.
      { userId: U2, lessonId: L3, quizId: "q-4" },
      // A question gone, then one still there.
      { userId: U3, lessonId: L1, quizId: "q-gone" },
      { userId: U3, lessonId: L2, quizId: "q-3" },
    ]);
    m.repo.findLessons.mockResolvedValue([...LESSONS, BROKEN]);

    expect(await learnersWithRecall([USER, U2, U3], NOW)).toEqual([USER, U3]);
    expect(m.repo.findDueQuestions).toHaveBeenCalledWith([USER, U2, U3], NOW);
    expect(m.repo.findLessons).toHaveBeenCalledTimes(1);
    expect(m.repo.createSession).not.toHaveBeenCalled();
  });

  it("looks at as many of a learner's cards as the draw does, the most overdue first", async () => {
    const stuck = Array.from({ length: 60 }, (_el, i) => ({
      userId: USER,
      lessonId: L3,
      quizId: `q-${String(i + 10)}`,
    }));
    m.repo.findDueQuestions.mockResolvedValue([
      ...stuck,
      { userId: USER, lessonId: L1, quizId: "q-1" },
    ]);
    m.repo.findLessons.mockResolvedValue([...LESSONS, BROKEN]);
    expect(await learnersWithRecall([USER], NOW)).toEqual([]);
  });

  it("reads nothing for nobody", async () => {
    expect(await learnersWithRecall([], NOW)).toEqual([]);
    expect(m.repo.findDueQuestions).not.toHaveBeenCalled();
  });
});

describe("a module's review", () => {
  const OUTLINE = {
    slug: "linux-fondamentaux",
    title: "Linux",
    modules: [
      { id: "m1", position: 1, title: "Les bases", description: null },
      { id: "m2", position: 2, title: "Les droits", description: null },
    ],
    lessons: [
      { lessonId: L3, moduleId: "m1" },
      { lessonId: L1, moduleId: "m2" },
      { lessonId: L2, moduleId: "m2" },
    ],
  };

  beforeEach(() => {
    m.findSheetOutline.mockResolvedValue(OUTLINE);
    m.repo.findCompletedLessons.mockImplementation((_user: string, ids: string[]) =>
      Promise.resolve(LESSONS.filter((lesson) => ids.includes(lesson.id))),
    );
  });

  it("asks the questions of the module's finished lessons, stores nothing", async () => {
    const view = await openModuleReview(USER, { path: "linux-fondamentaux", module: 2 }, NOW);
    expect(m.findSheetOutline).toHaveBeenCalledWith("linux-fondamentaux", USER);
    expect(m.repo.findCompletedLessons).toHaveBeenCalledWith(USER, [L1, L2]);
    expect(view).toMatchObject({
      mode: "module",
      status: "open",
      day: DAY,
      title: "Module 02 · Les droits",
      module: { path: "linux-fondamentaux", number: 2 },
    });
    expect(view.questions.map((q) => q.quizId).sort()).toEqual(["q-1", "q-2", "q-3"]);
    expect(m.repo.createSession).not.toHaveBeenCalled();
  });

  it("is the same all day", async () => {
    const a = await openModuleReview(USER, { path: "linux-fondamentaux", module: 2 }, NOW);
    const b = await openModuleReview(
      USER,
      { path: "linux-fondamentaux", module: 2 },
      new Date("2026-10-17T19:00:00Z"),
    );
    expect(b.questions).toEqual(a.questions);
  });

  it("has nothing to ask before a lesson of the module is finished", async () => {
    m.repo.findCompletedLessons.mockResolvedValue([]);
    const view = await openModuleReview(USER, { path: "linux-fondamentaux", module: 1 }, NOW);
    expect(view.status).toBe("empty");
  });

  it("is missing for a path the reader may not open, a module it lacks, or a malformed request", async () => {
    expect(
      (await openModuleReview(USER, { path: "linux-fondamentaux", module: 9 }, NOW)).status,
    ).toBe("missing");
    expect((await openModuleReview(USER, { path: "" }, NOW)).status).toBe("missing");
    m.findSheetOutline.mockResolvedValue(null);
    expect((await openModuleReview(USER, { path: "autre", module: 1 }, NOW)).status).toBe(
      "missing",
    );
  });

  it("checks an answer against the day's option order, and records nothing", async () => {
    const order = reviewOptionOrder(Q2, USER, L1, "q-2", DAY);
    const input = {
      path: "linux-fondamentaux",
      module: 2,
      day: DAY,
      index: 3,
      lessonId: L1,
      quizId: "q-2",
      selected: order.indexOf(0),
    };
    const res = await answerModuleReview(USER, input);
    expect(res).toEqual({
      ok: true,
      verdict: {
        index: 3,
        selected: order.indexOf(0),
        correct: true,
        correctIndex: order.indexOf(0),
        explanation: null,
        passage: { lessonTitle: "Les droits", href: "/lessons/linux-droits?section=2#quiz-q-2" },
      },
      result: null,
    });
    expect(m.repo.answerInSession).not.toHaveBeenCalled();
    expect(m.repo.applyAnswer).not.toHaveBeenCalled();
    expect(m.creditXp).not.toHaveBeenCalled();
  });

  it("refuses a question outside the module, a question gone, or an option not shown", async () => {
    const base = { path: "linux-fondamentaux", module: 2, day: DAY, index: 0, selected: 0 };
    expect(await answerModuleReview(USER, { ...base, lessonId: L3, quizId: "q-1" })).toEqual({
      ok: false,
      error: "Cette question n'est plus disponible.",
    });
    expect(await answerModuleReview(USER, { ...base, lessonId: L1, quizId: "q-9" })).toEqual({
      ok: false,
      error: "Cette question n'est plus disponible.",
    });
    expect(
      await answerModuleReview(USER, { ...base, lessonId: L1, quizId: "q-1", selected: 7 }),
    ).toEqual({ ok: false, error: "Réponse invalide." });
    expect(
      await answerModuleReview(USER, { ...base, lessonId: "pas-un-id", quizId: "q-1" }),
    ).toEqual({ ok: false, error: "Réponse invalide." });
  });
});
