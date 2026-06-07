import { describe, expect, it } from "vitest";
import {
  type QuizQuestionFull,
  checkCanSubmit,
  drawQuestions,
  isInCooldown,
  isPassed,
  isResumable,
  scoreSubmission,
  toClientQuestion,
  validateSubmission,
} from "../quiz.js";

const q = (id: string, correct: string): QuizQuestionFull => ({
  id,
  question: `Q${id}?`,
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ],
  correctOptionId: correct,
  explanation: `because ${correct}`,
});

const POOL = [q("1", "a"), q("2", "b"), q("3", "c"), q("4", "a"), q("5", "b")];

// Deterministic RNG (LCG) so draw tests are stable.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1103515245 * s + 12345) >>> 0;
    return s / 0xffffffff;
  };
}

describe("scoreSubmission", () => {
  it("scores correct answers as a percentage of the DRAWN set", () => {
    const drawn = [q("1", "a"), q("2", "b"), q("3", "c"), q("4", "a")];
    const { score, results } = scoreSubmission(drawn, {
      "1": "a",
      "2": "b",
      "3": "x" as string,
      "4": "a",
    });
    // 3/4 correct (q3 wrong) → 75
    expect(score).toBe(75);
    expect(results.find((r) => r.questionId === "3")?.correct).toBe(false);
  });

  it("counts omitted answers as wrong (denominator = drawn, not payload)", () => {
    const drawn = [q("1", "a"), q("2", "b"), q("3", "c"), q("4", "a")];
    // Only answer 1 (correctly). Omitting the rest must NOT raise the score.
    const { score, results } = scoreSubmission(drawn, { "1": "a" });
    expect(score).toBe(25); // 1/4, not 1/1
    expect(results.filter((r) => r.correct)).toHaveLength(1);
    expect(results.find((r) => r.questionId === "2")?.selected).toBeNull();
  });

  it("100% and 0%", () => {
    const drawn = [q("1", "a"), q("2", "b")];
    expect(scoreSubmission(drawn, { "1": "a", "2": "b" }).score).toBe(100);
    expect(scoreSubmission(drawn, { "1": "b", "2": "a" }).score).toBe(0);
  });

  it("isPassed respects the threshold boundary", () => {
    expect(isPassed(70, 70)).toBe(true);
    expect(isPassed(69, 70)).toBe(false);
  });
});

describe("toClientQuestion", () => {
  it("never exposes correctOptionId (or explanation)", () => {
    const client = toClientQuestion(q("1", "a")) as unknown as Record<string, unknown>;
    expect(client.correctOptionId).toBeUndefined();
    expect(client.explanation).toBeUndefined();
    expect(client).toEqual({
      id: "1",
      question: "Q1?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
    });
  });
});

describe("validateSubmission", () => {
  const drawn = [q("1", "a"), q("2", "b")];
  it("accepts a valid submission", () => {
    expect(validateSubmission({ "1": "a", "2": "c" }, drawn)).toBeNull();
  });
  it("rejects a questionId outside the drawn set", () => {
    expect(validateSubmission({ "1": "a", "99": "a" }, drawn)).toMatch(/Unknown question/);
  });
  it("rejects an optionId not belonging to the question", () => {
    expect(validateSubmission({ "1": "z" }, drawn)).toMatch(/Invalid option/);
  });
});

describe("drawQuestions", () => {
  it("draws exactly n questions, all from the pool", () => {
    const drawn = drawQuestions(POOL, 3, seeded(42));
    expect(drawn).toHaveLength(3);
    const poolIds = new Set(POOL.map((p) => p.id));
    expect(drawn.every((d) => poolIds.has(d.id))).toBe(true);
    expect(new Set(drawn.map((d) => d.id)).size).toBe(3); // no duplicates
  });
  it("preserves each question's option set (only order may change)", () => {
    const drawn = drawQuestions(POOL, 5, seeded(7));
    for (const d of drawn) {
      expect(new Set(d.options.map((o) => o.id))).toEqual(new Set(["a", "b", "c"]));
    }
  });
  it("keeps the correctOptionId attached after the draw (server still scores)", () => {
    const drawn = drawQuestions([q("1", "a")], 1, seeded(1));
    expect(drawn[0]?.correctOptionId).toBe("a");
  });
});

describe("checkCanSubmit", () => {
  const base = { userId: "u1", startedAt: new Date(), submittedAt: null };
  it("ok for the owner of an un-submitted attempt", () => {
    expect(checkCanSubmit(base, "u1")).toEqual({ ok: true });
  });
  it("rejects a different user", () => {
    expect(checkCanSubmit(base, "u2")).toEqual({ ok: false, reason: "not-owner" });
  });
  it("rejects re-submission", () => {
    expect(checkCanSubmit({ ...base, submittedAt: new Date() }, "u1")).toEqual({
      ok: false,
      reason: "already-submitted",
    });
  });
});

describe("resume / cooldown windows", () => {
  const now = new Date("2026-06-06T12:00:00Z");
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);

  it("a recent un-submitted attempt is resumable", () => {
    expect(isResumable({ userId: "u", startedAt: minsAgo(5), submittedAt: null }, now, 30)).toBe(
      true,
    );
  });
  it("an old un-submitted attempt is not resumable", () => {
    expect(isResumable({ userId: "u", startedAt: minsAgo(45), submittedAt: null }, now, 30)).toBe(
      false,
    );
  });
  it("a recent submitted attempt is in cooldown", () => {
    expect(
      isInCooldown({ userId: "u", startedAt: minsAgo(20), submittedAt: minsAgo(10) }, now, 30),
    ).toBe(true);
  });
  it("an old submitted attempt is past cooldown", () => {
    expect(
      isInCooldown({ userId: "u", startedAt: minsAgo(60), submittedAt: minsAgo(40) }, now, 30),
    ).toBe(false);
  });
});
