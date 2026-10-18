import { describe, expect, it } from "vitest";
import { recallAnswerReplySchema, recallReplySchema } from "../review-cards.schema";

const QUESTION = {
  index: 0,
  lessonId: "22222222-2222-4222-8222-222222222222",
  quizId: "q-1",
  lessonTitle: "Les permissions",
  question: "Que donne chmod 600 ?",
  options: ["rw- --- ---", "rwx --- ---"],
};

const VERDICT = {
  index: 0,
  selected: 1,
  correct: false,
  correctIndex: 0,
  explanation: "6, c'est lecture et écriture.",
  passage: {
    lessonTitle: "Les permissions",
    href: "/lessons/linux-permissions?section=2#quiz-q-1",
  },
};

const VIEW = {
  mode: "daily",
  status: "open",
  day: "2026-10-17",
  title: "Rappel du jour",
  module: null,
  questions: [QUESTION],
  verdicts: [],
  result: null,
};

describe("recallReplySchema", () => {
  it("reads the day's recall and a module's review", () => {
    expect(recallReplySchema.safeParse({ ok: true, recall: VIEW }).success).toBe(true);
    const review = {
      ...VIEW,
      mode: "module",
      title: "Module 02 · Les permissions",
      module: { path: "linux-fondamentaux", number: 2 },
    };
    expect(recallReplySchema.safeParse({ ok: true, recall: review }).success).toBe(true);
  });

  it("reads a refusal with its reason", () => {
    const parsed = recallReplySchema.safeParse({ ok: false, error: "Requête invalide." });
    expect(parsed.success && !parsed.data.ok && parsed.data.error).toBe("Requête invalide.");
  });

  it("keeps working when the server adds a field it does not know yet", () => {
    const parsed = recallReplySchema.safeParse({ ok: true, recall: { ...VIEW, extra: 1 } });
    expect(parsed.success).toBe(true);
  });

  it("refuses half a reply rather than drawing a screen from it", () => {
    for (const body of [
      null,
      "Rappel du jour",
      { ok: true },
      { ok: true, recall: { ...VIEW, status: "later" } },
      { ok: true, recall: { ...VIEW, day: "17/10/2026" } },
      { ok: true, recall: { ...VIEW, questions: [{ ...QUESTION, options: "A" }] } },
      { ok: false },
    ]) {
      expect(recallReplySchema.safeParse(body).success).toBe(false);
    }
  });
});

describe("recallAnswerReplySchema", () => {
  it("reads a verdict, with the result once the recall is handed in", () => {
    expect(
      recallAnswerReplySchema.safeParse({ ok: true, verdict: VERDICT, result: null }).success,
    ).toBe(true);
    const handedIn = recallAnswerReplySchema.safeParse({
      ok: true,
      verdict: { ...VERDICT, explanation: null, passage: null },
      result: { correct: 1, total: 2, xp: 15 },
    });
    expect(handedIn.success && handedIn.data.ok && handedIn.data.result?.xp).toBe(15);
  });

  it("refuses a verdict without the right option", () => {
    const partial = { index: 0, selected: 1, correct: false, explanation: null, passage: null };
    expect(
      recallAnswerReplySchema.safeParse({ ok: true, verdict: partial, result: null }).success,
    ).toBe(false);
  });
});
