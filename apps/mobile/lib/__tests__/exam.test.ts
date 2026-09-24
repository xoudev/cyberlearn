import { describe, expect, it } from "vitest";
import {
  correctNeeded,
  finalStepOf,
  formatClock,
  optionVerdict,
  deadlineOf,
  secondsUntil,
  secondsUsed,
  thresholdGap,
  unansweredCount,
  waitLabel,
  type ExamStatusDto,
} from "../exam";

function status(overrides: Partial<ExamStatusDto> = {}): ExamStatusDto {
  return {
    hasQuiz: true,
    lessonsComplete: true,
    pathCompleted: false,
    certPublicId: null,
    questionCount: 20,
    passThreshold: 70,
    timeLimitMinutes: 30,
    resumeStartedAt: null,
    cooldownUntil: null,
    ...overrides,
  };
}

const START = "2026-09-24T10:00:00.000Z";
const startMs = Date.parse(START);

describe("finalStepOf", () => {
  it("shows the certificate once the path is validated, whatever else is true", () => {
    expect(
      finalStepOf(
        status({ pathCompleted: true, certPublicId: "abc", cooldownUntil: "2026-09-26T10:00:00Z" }),
      ),
    ).toEqual({ kind: "certified", publicId: "abc" });
  });

  it("keeps the exam locked while lessons remain, with or without one", () => {
    expect(finalStepOf(status({ lessonsComplete: false }))).toEqual({ kind: "locked" });
    expect(finalStepOf(status({ lessonsComplete: false, hasQuiz: false }))).toEqual({
      kind: "locked",
    });
  });

  it("offers the claim on a finished path with no exam", () => {
    expect(finalStepOf(status({ hasQuiz: false }))).toEqual({ kind: "claim" });
  });

  it("resumes a running attempt before anything else", () => {
    expect(finalStepOf(status({ resumeStartedAt: START }))).toEqual({
      kind: "resume",
      startedAt: START,
    });
  });

  it("holds the next attempt during the wait, and is ready after it", () => {
    expect(finalStepOf(status({ cooldownUntil: "2026-09-26T10:00:00Z" }))).toEqual({
      kind: "cooldown",
      until: "2026-09-26T10:00:00Z",
    });
    expect(finalStepOf(status())).toEqual({ kind: "ready" });
  });
});

describe("formatClock", () => {
  it("writes minutes and seconds on two digits each", () => {
    expect(formatClock(30 * 60)).toBe("30:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(9)).toBe("00:09");
  });

  it("never shows a negative or fractional time", () => {
    expect(formatClock(-3)).toBe("00:00");
    expect(formatClock(59.9)).toBe("00:59");
  });
});

describe("deadlineOf / secondsUntil / secondsUsed", () => {
  it("anchors the deadline to this phone's clock, from the server's count", () => {
    // Server says 18 minutes are left; the phone's clock, even if wrong, only
    // measures the time from here.
    const deadline = deadlineOf(18 * 60, startMs);
    expect(secondsUntil(deadline, startMs)).toBe(1080);
    expect(secondsUntil(deadline, startMs + 60_000)).toBe(1020);
    expect(secondsUsed(deadline, startMs + 60_000, 30)).toBe(780);
  });

  it("rounds a part-second up, so the clock never reads 00:00 early", () => {
    const deadline = deadlineOf(10, startMs);
    expect(secondsUntil(deadline, startMs + 9_200)).toBe(1);
  });

  it("stops at zero once the deadline is past, and never counts beyond the limit", () => {
    const deadline = deadlineOf(60, startMs);
    expect(secondsUntil(deadline, startMs + 5 * 60_000)).toBe(0);
    expect(secondsUsed(deadline, startMs + 5 * 60_000, 30)).toBe(1800);
    expect(deadlineOf(-5, startMs)).toBe(startMs);
  });
});

describe("unansweredCount", () => {
  it("counts the questions with no answer", () => {
    const questions = [{ id: "q-1" }, { id: "q-2" }, { id: "q-3" }];
    expect(unansweredCount(questions, { "q-2": "b" })).toBe(2);
    expect(unansweredCount(questions, { "q-1": "a", "q-2": "b", "q-3": "c" })).toBe(0);
  });
});

describe("correctNeeded", () => {
  it("rounds up, as the site's rules card does", () => {
    expect(correctNeeded(20, 70)).toBe(14);
    expect(correctNeeded(15, 70)).toBe(11);
  });
});

describe("waitLabel", () => {
  it("says hours for a long wait, rounded up", () => {
    expect(waitLabel("2026-09-26T10:00:00.000Z", startMs)).toBe("dans 48 h");
    expect(waitLabel(START, startMs - 90 * 60_000)).toBe("dans 2 h");
  });

  it("says minutes under an hour, and never zero", () => {
    expect(waitLabel(START, startMs - 12 * 60_000)).toBe("dans 12 min");
    expect(waitLabel(START, startMs - 20_000)).toBe("dans moins d'une minute");
    expect(waitLabel(START, startMs + 5_000)).toBe("dans moins d'une minute");
  });
});

describe("thresholdGap", () => {
  it("signs the gap to the threshold", () => {
    expect(thresholdGap(85, 70)).toBe("+15 pts au-dessus du seuil");
    expect(thresholdGap(70, 70)).toBe("pile au seuil");
    expect(thresholdGap(55, 70)).toBe("-15 pts sous le seuil");
  });
});

describe("optionVerdict", () => {
  it("marks only the learner's own pick", () => {
    const right = { questionId: "q-1", selected: "b", correct: true };
    const wrong = { questionId: "q-2", selected: "a", correct: false };
    expect(optionVerdict(right, "b")).toBe("right");
    expect(optionVerdict(right, "a")).toBeNull();
    expect(optionVerdict(wrong, "a")).toBe("wrong");
    expect(optionVerdict({ questionId: "q-3", selected: null, correct: false }, "a")).toBeNull();
  });
});
