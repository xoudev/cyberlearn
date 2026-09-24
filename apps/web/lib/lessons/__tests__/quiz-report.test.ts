import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Db from "@cyberlearn/db";
import { QUIZ_REPORT_REASON_KEYS } from "@cyberlearn/lib/quiz/report-reasons";

/**
 * A learner reporting a quiz: checked like an answer (the lesson opened, the
 * question real), limited per hour, and one report per learner and question.
 */

const LESSON = "11111111-1111-4111-8111-111111111111";

const m = vi.hoisted(() => ({
  lessonFindUnique: vi.fn(),
  findProgress: vi.fn(),
  upsert: vi.fn(),
  countSince: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  QUIZ_REPORT_REASONS: ["AMBIGUOUS", "WRONG_ANSWER", "TYPO", "OTHER"],
  prisma: { lesson: { findUnique: m.lessonFindUnique } },
  lessonRepository: { findProgress: m.findProgress },
  quizReportRepository: { upsert: m.upsert, countSince: m.countSince },
}));

const { reportQuiz, QUIZ_REPORTS_PER_HOUR } = await import("../quiz-report");

const MDX =
  '<Quiz id="q-1" question="Quelle norme ?" options={["ISO 27001", "ISO 9001"]} correct={0} />';

beforeEach(() => {
  vi.clearAllMocks();
  m.lessonFindUnique.mockResolvedValue({ contentMdx: MDX });
  m.findProgress.mockResolvedValue({ status: "IN_PROGRESS" });
  m.countSince.mockResolvedValue(0);
});

describe("reportQuiz", () => {
  it("records the report, with its reason and comment", async () => {
    const result = await reportQuiz("user-1", {
      lessonId: LESSON,
      quizId: "q-1",
      reason: "AMBIGUOUS",
      comment: "  Deux réponses se défendent.  ",
    });
    expect(result).toEqual({ ok: true });
    expect(m.upsert).toHaveBeenCalledWith(
      "user-1",
      LESSON,
      "q-1",
      "AMBIGUOUS",
      "Deux réponses se défendent.",
    );
  });

  it("stores no comment rather than an empty one", async () => {
    await reportQuiz("user-1", { lessonId: LESSON, quizId: "q-1", reason: "TYPO", comment: "   " });
    expect(m.upsert).toHaveBeenCalledWith("user-1", LESSON, "q-1", "TYPO", null);
  });

  it.each([
    ["an unknown reason", { lessonId: LESSON, quizId: "q-1", reason: "SPAM" }],
    ["a lesson id that is not one", { lessonId: "x", quizId: "q-1", reason: "TYPO" }],
    [
      "a comment too long",
      { lessonId: LESSON, quizId: "q-1", reason: "TYPO", comment: "a".repeat(501) },
    ],
    ["nothing at all", null],
  ])("refuses %s", async (_, input) => {
    expect(await reportQuiz("user-1", input)).toEqual({
      ok: false,
      error: "Signalement invalide.",
    });
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("refuses a lesson the learner never opened, where access is decided", async () => {
    m.findProgress.mockResolvedValue(null);
    const result = await reportQuiz("user-1", { lessonId: LESSON, quizId: "q-1", reason: "TYPO" });
    expect(result).toEqual({ ok: false, error: "Leçon introuvable." });
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("refuses a question the lesson does not have", async () => {
    const result = await reportQuiz("user-1", { lessonId: LESSON, quizId: "q-9", reason: "TYPO" });
    expect(result).toEqual({ ok: false, error: "Cette question n'existe plus dans la leçon." });
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("stops after too many reports in an hour", async () => {
    m.countSince.mockResolvedValue(QUIZ_REPORTS_PER_HOUR);
    const result = await reportQuiz("user-1", { lessonId: LESSON, quizId: "q-1", reason: "TYPO" });
    expect(result.ok).toBe(false);
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("offers in the forms exactly the reasons the database takes", async () => {
    // The real module, not the mock above: the list it exports is checked
    // against the Prisma enum when packages/db typechecks.
    const db = await vi.importActual<typeof Db>("@cyberlearn/db");
    expect([...QUIZ_REPORT_REASON_KEYS]).toEqual([...db.QUIZ_REPORT_REASONS]);
  });
});
