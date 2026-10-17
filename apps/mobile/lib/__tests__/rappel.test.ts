import { describe, expect, it } from "vitest";
import {
  emptyRun,
  firstOpen,
  moduleAnswerBody,
  moduleReviewable,
  moduleReviewPath,
  passageRoute,
  passageSection,
  readRecallAnswer,
  readRecallReply,
  recallCardState,
  recallFlow,
  RECALL_LOAD_FAILED,
  runWith,
  runWithout,
  shownQuestion,
  withVerdict,
  type RecallQuestion,
  type RecallVerdict,
  type RecallView,
} from "../rappel";

const LESSON = "22222222-2222-4222-8222-222222222222";

function question(index: number): RecallQuestion {
  return {
    index,
    lessonId: LESSON,
    quizId: `q-${String(index)}`,
    lessonTitle: "Les permissions",
    question: `Question ${String(index)}`,
    options: ["rw- --- ---", "rwx --- ---"],
  };
}

function verdict(index: number, correct = true): RecallVerdict {
  return {
    index,
    selected: correct ? 0 : 1,
    correct,
    correctIndex: 0,
    explanation: null,
    passage: null,
  };
}

function view(overrides: Partial<RecallView> = {}): RecallView {
  return {
    mode: "daily",
    status: "open",
    day: "2026-10-17",
    title: "Rappel du jour",
    module: null,
    questions: [question(0), question(1)],
    verdicts: [],
    result: null,
    ...overrides,
  };
}

const MODULE: Partial<RecallView> = {
  mode: "module",
  title: "Module 02 · Les permissions",
  module: { path: "linux-fondamentaux", number: 2 },
};

describe("readRecallReply", () => {
  it("reads the questions the server sent", () => {
    expect(readRecallReply({ ok: true, recall: view() })).toEqual({ ok: true, recall: view() });
  });

  it("passes the server's reason on", () => {
    expect(readRecallReply({ ok: false, error: "Non authentifié." })).toEqual({
      ok: false,
      error: "Non authentifié.",
    });
  });

  it("never draws a screen from half a reply", () => {
    for (const body of [null, {}, { ok: true }, { ok: true, recall: { status: "open" } }]) {
      expect(readRecallReply(body)).toEqual({ ok: false, error: RECALL_LOAD_FAILED });
    }
  });
});

describe("readRecallAnswer", () => {
  it("reads a verdict, and the hand-in with the last one", () => {
    expect(readRecallAnswer({ ok: true, verdict: verdict(0), result: null })).toEqual({
      ok: true,
      verdict: verdict(0),
      result: null,
    });
    const last = readRecallAnswer({
      ok: true,
      verdict: verdict(1, false),
      result: { correct: 1, total: 2, xp: 15 },
    });
    expect(last?.ok === true && last.result).toEqual({ correct: 1, total: 2, xp: 15 });
  });

  it("reads the server's refusal: nothing was recorded", () => {
    expect(readRecallAnswer({ ok: false, error: "Tu as déjà répondu à cette question." })).toEqual({
      ok: false,
      error: "Tu as déjà répondu à cette question.",
    });
  });

  it("says nothing it cannot read, so the question stays to be answered", () => {
    expect(readRecallAnswer({ ok: true, verdict: { index: 0 } })).toBeNull();
    expect(readRecallAnswer("<html>")).toBeNull();
  });
});

describe("a module's review on the wire", () => {
  it("asks for the module by its path and its number", () => {
    expect(moduleReviewPath("linux-fondamentaux", 2)).toBe(
      "/api/mobile/review-cards?path=linux-fondamentaux&module=2",
    );
  });

  it("sends back the day and the question with the answer", () => {
    expect(moduleAnswerBody(view(MODULE), question(1), 0)).toEqual({
      path: "linux-fondamentaux",
      module: 2,
      day: "2026-10-17",
      index: 1,
      lessonId: LESSON,
      quizId: "q-1",
      selected: 0,
    });
    expect(moduleAnswerBody(view(), question(1), 0)).toBeNull();
  });
});

describe("recallCardState: the home tab's card, as the site's dashboard says it", () => {
  it("says to do, done or nothing today", () => {
    expect(recallCardState(view())).toBe("todo");
    // Half answered is still to do: the rest waits, never counted.
    expect(recallCardState(view({ verdicts: [verdict(0)] }))).toBe("todo");
    expect(
      recallCardState(view({ status: "done", result: { correct: 2, total: 2, xp: 15 } })),
    ).toBe("done");
    expect(recallCardState(view({ status: "empty", questions: [] }))).toBe("empty");
  });

  it("has no card with spaced repetition off, or before the recall is read", () => {
    expect(recallCardState(view({ status: "off", questions: [] }))).toBeNull();
    expect(recallCardState(undefined)).toBeNull();
    expect(recallCardState(view(MODULE))).toBeNull();
  });
});

describe("withVerdict", () => {
  it("adds the verdict, and hands the recall in with the last answer", () => {
    const once = withVerdict(view(), verdict(0), null);
    expect(once.verdicts).toEqual([verdict(0)]);
    expect(recallCardState(once)).toBe("todo");

    const done = withVerdict(once, verdict(1, false), { correct: 1, total: 2, xp: 15 });
    expect(done.verdicts).toEqual([verdict(0), verdict(1, false)]);
    expect(done.result).toEqual({ correct: 1, total: 2, xp: 15 });
    expect(recallCardState(done)).toBe("done");
  });

  it("keeps one verdict a question", () => {
    expect(withVerdict(view({ verdicts: [verdict(0)] }), verdict(0), null).verdicts).toHaveLength(
      1,
    );
  });
});

describe("recallFlow and shownQuestion: a run, one question at a time", () => {
  it("opens on the first question still open, the answers already given kept", () => {
    const flow = recallFlow(view({ verdicts: [verdict(0)] }), emptyRun("2026-10-17"));
    expect(flow.next).toBe(1);
    expect(shownQuestion(flow, undefined)).toBe(1);
    expect(flow.result).toBeNull();
  });

  it("keeps the answered question on screen until the reader goes on", () => {
    const v = view();
    const run = runWith(v, emptyRun(v.day), verdict(0), null);
    const flow = recallFlow(v, run);
    expect(flow.verdicts).toEqual([verdict(0)]);
    expect(flow.next).toBe(1);
    expect(shownQuestion(flow, 0)).toBe(0);
    expect(shownQuestion(flow, flow.next)).toBe(1);
  });

  it("ends the day's recall on the server's hand-in", () => {
    const v = view();
    let run = runWith(v, emptyRun(v.day), verdict(0), null);
    run = runWith(v, run, verdict(1, false), { correct: 1, total: 2, xp: 15 });
    const flow = recallFlow(v, run);
    expect(flow.next).toBeNull();
    expect(flow.result).toEqual({ correct: 1, total: 2, xp: 15 });
    expect(shownQuestion(flow, null)).toBeNull();
  });

  it("opens a recall already done on its end", () => {
    const done = view({
      status: "done",
      verdicts: [verdict(0), verdict(1)],
      result: { correct: 2, total: 2, xp: 15 },
    });
    const flow = recallFlow(done, emptyRun(done.day));
    expect(shownQuestion(flow, undefined)).toBeNull();
    expect(flow.result?.xp).toBe(15);
  });

  it("does not merge a verdict the server already holds twice", () => {
    const v = view({ verdicts: [verdict(0)] });
    const flow = recallFlow(v, runWith(v, emptyRun(v.day), verdict(0), null));
    expect(flow.verdicts).toHaveLength(1);
  });

  it("tallies a module's review itself, without XP", () => {
    const v = view(MODULE);
    let run = runWith(v, emptyRun(v.day), verdict(0), null);
    expect(recallFlow(v, run).result).toBeNull();
    run = runWith(v, run, verdict(1, false), null);
    expect(recallFlow(v, run).result).toEqual({ correct: 1, total: 2, xp: 0 });
  });

  it("sets aside a module's question that could not be checked, and goes on", () => {
    const v = view(MODULE);
    const run = runWithout(v, emptyRun(v.day), 0);
    const flow = recallFlow(v, run);
    expect(flow.questions.map((q) => q.index)).toEqual([1]);
    // The reader was on the question set aside: the next one takes its place.
    expect(shownQuestion(flow, 0)).toBe(1);
    expect(recallFlow(v, runWithout(v, run, 1)).questions).toEqual([]);
  });

  it("shows a refused question again when it is still asked, the next one when it is gone", () => {
    const answeredElsewhere = view({ verdicts: [verdict(1)] });
    expect(shownQuestion(recallFlow(answeredElsewhere, emptyRun("2026-10-17")), 1)).toBe(1);
    const gone = view({ questions: [question(0)] });
    expect(shownQuestion(recallFlow(gone, emptyRun("2026-10-17")), 1)).toBe(0);
  });

  it("starts afresh on another day's recall", () => {
    const yesterday = runWith(view(), emptyRun("2026-10-16"), verdict(0), null);
    const today = view({ day: "2026-10-18" });
    expect(recallFlow(today, yesterday).verdicts).toEqual([]);
  });

  it("finds the first open question by drawn index", () => {
    expect(firstOpen([question(3), question(5)], [verdict(3)])).toBe(5);
    expect(firstOpen([question(3)], [verdict(3)])).toBeNull();
    expect(firstOpen([], [])).toBeNull();
  });
});

describe("passageRoute: « Revoir ce passage » in the app", () => {
  it("opens the lesson on the section and the question the site links to", () => {
    expect(passageRoute("/lessons/linux-permissions?section=2#quiz-q-1")).toEqual({
      pathname: "/lessons/[slug]",
      params: { slug: "linux-permissions", section: "2", quiz: "q-1" },
    });
  });

  it("opens the lesson at its start when the site knows no section", () => {
    expect(passageRoute("/lessons/linux-permissions#quiz-q-1")).toEqual({
      pathname: "/lessons/[slug]",
      params: { slug: "linux-permissions", quiz: "q-1" },
    });
    expect(passageRoute("/lessons/linux-permissions")).toEqual({
      pathname: "/lessons/[slug]",
      params: { slug: "linux-permissions" },
    });
  });

  it("reads a question id the site encoded", () => {
    expect(passageRoute("/lessons/l?section=1#quiz-q%201")?.params.quiz).toBe("q 1");
  });

  it("refuses a link that is not to a lesson", () => {
    expect(passageRoute("/paths/linux-fondamentaux")).toBeNull();
    expect(passageRoute("https://example.com/lessons/x")).toBeNull();
    expect(passageRoute("/lessons/%E0%A4%A")).toBeNull();
    expect(passageRoute("/lessons/Bad_Slug")).toBeNull();
  });
});

describe("passageSection: the section the lesson screen opens on", () => {
  const sections = [
    { blocks: [{ kind: "paragraph" }] },
    { blocks: [{ kind: "paragraph" }, { kind: "quiz", id: "q-1" }] },
    { blocks: [{ kind: "quiz", id: "q-2" }] },
  ];

  it("asks for nothing when the address names no passage", () => {
    expect(passageSection(sections, {})).toBeNull();
  });

  it("opens the section that holds the question, whatever the site counted", () => {
    // The app keeps an introduction as its own section: the site's 1 is its 2.
    expect(passageSection(sections, { section: "1", quiz: "q-1" })).toBe(1);
    expect(passageSection(sections, { quiz: ["q-2"] })).toBe(2);
  });

  it("falls back on the site's section, then on the first", () => {
    expect(passageSection(sections, { section: "3", quiz: "gone" })).toBe(2);
    expect(passageSection(sections, { section: "9" })).toBe(0);
    expect(passageSection(sections, { quiz: "gone" })).toBe(0);
  });
});

describe("moduleReviewable", () => {
  const missions = [{ status: "COMPLETED" }, { status: "IN_PROGRESS" }, { status: null }];

  it("offers a module's review once one of its lessons is finished", () => {
    expect(moduleReviewable(missions, [0, 1])).toBe(true);
    expect(moduleReviewable(missions, [1, 2])).toBe(false);
    expect(moduleReviewable(missions, [])).toBe(false);
    expect(moduleReviewable(missions, [7])).toBe(false);
  });
});
