// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unlockDateLabel } from "@/lib/exam/cooldown-label";

const m = vi.hoisted(() => ({
  startQuizAttempt: vi.fn<(pathId: string) => Promise<unknown>>(),
  submitQuizAttempt: vi.fn<(attemptId: string, answers: unknown) => Promise<unknown>>(),
  refresh: vi.fn(),
}));

vi.mock("../../../_actions/quiz-actions", () => ({
  startQuizAttempt: m.startQuizAttempt,
  submitQuizAttempt: m.submitQuizAttempt,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));

const { ExamFlow, RetryAfterWait } = await import("../exam-flow");
const { draftKey } = await import("@cyberlearn/lib/exam/answers-draft");
const { SUBMIT_FAILED, START_FAILED } = await import("@/lib/exam/network-messages");

/**
 * The final exam after a fail: the next attempt stays locked while the wait
 * runs, counting down to it and naming the day it ends, then opens and leads
 * back to the rules. It used to be a button disabled for good.
 */

const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);
const SECOND = 1000;

const PROPS = {
  pathId: "p1",
  pathSlug: "python",
  pathTitle: "Python",
  refCode: "CL-PTH-001",
  hasQuiz: true,
  lessonsComplete: true,
  pathCompleted: false,
  certPublicId: null,
  questionCount: 1,
  passThreshold: 70,
  timeLimitMinutes: 30,
  resumeStartedAtMs: null,
  cooldownUntilMs: null,
};

/** Lets the mocked server actions answer, inside act. */
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  });
}

function tick(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function button(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(NOW);
  m.startQuizAttempt.mockReset();
  m.submitQuizAttempt.mockReset();
  m.refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RetryAfterWait", () => {
  it("counts down while the wait runs, then opens the next attempt", () => {
    const until = NOW + 2 * SECOND;
    const onRetry = vi.fn();
    render(<RetryAfterWait untilMs={until} pathSlug="python" onRetry={onRetry} />);

    expect(button("Réessayer dans 2 s")).toHaveProperty("disabled", true);
    expect(document.querySelector(".r-cooldown")?.textContent).toContain(
      `Nouvelle tentative possible le ${unlockDateLabel(until)}`,
    );
    expect(screen.queryByRole("button", { name: "Réessayer l'examen" })).toBeNull();

    tick(SECOND);
    expect(button("Réessayer dans 1 s")).toHaveProperty("disabled", true);

    tick(SECOND);
    const retry = button("Réessayer l'examen");
    expect(retry).toHaveProperty("disabled", false);
    expect(document.querySelector(".r-cooldown")).toBeNull();
    // The clock stops with the wait.
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("opens the next attempt at once when there is no wait to count", () => {
    const onRetry = vi.fn();
    render(<RetryAfterWait untilMs={null} pathSlug="python" onRetry={onRetry} />);

    expect(button("Réessayer l'examen")).toHaveProperty("disabled", false);
    expect(document.querySelector(".r-cooldown")).toBeNull();
    // No clock left running: an interval would still be pending after this.
    tick(5 * SECOND);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole("link", { name: "Revoir le parcours" }).getAttribute("href")).toBe(
      "/paths/python",
    );
  });
});

describe("ExamFlow", () => {
  it("after a failed copy, waits, then goes back to the rules read again", async () => {
    m.startQuizAttempt.mockResolvedValue({
      ok: true,
      attemptId: "a1",
      questions: [
        {
          id: "q1",
          question: "Que vaut len([1, 2]) ?",
          options: [
            { id: "a", text: "1" },
            { id: "b", text: "2" },
          ],
        },
      ],
      startedAt: new Date(NOW),
    });
    m.submitQuizAttempt.mockResolvedValue({
      ok: true,
      score: 0,
      passed: false,
      results: [{ questionId: "q1", selected: "a", correct: false, explanation: null }],
      cooldownUntil: new Date(NOW + 2 * SECOND),
    });
    render(<ExamFlow {...PROPS} />);

    fireEvent.click(button("Commencer l'examen"));
    await settle();
    expect(m.startQuizAttempt).toHaveBeenCalledWith("p1");
    fireEvent.click(screen.getByRole("button", { name: /^A\s*1/ }));
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledWith("a1", { q1: "a" });

    expect(screen.getByText("Seuil non atteint.")).toBeTruthy();
    expect(button("Réessayer dans 2 s")).toHaveProperty("disabled", true);

    tick(2 * SECOND);
    fireEvent.click(button("Réessayer l'examen"));

    expect(screen.getByRole("button", { name: "Commencer l'examen" })).toBeTruthy();
    expect(m.refresh).toHaveBeenCalledTimes(1);
  });

  it("hands the copy in once at zero, then leaves the retry to the reader", async () => {
    const option = (id: string) => ({ id, text: id });
    m.startQuizAttempt.mockResolvedValue({
      ok: true,
      attemptId: "a1",
      questions: [
        { id: "q1", question: "Première ?", options: [option("a"), option("b")] },
        { id: "q2", question: "Seconde ?", options: [option("a"), option("b")] },
      ],
      startedAt: new Date(NOW),
    });
    m.submitQuizAttempt.mockResolvedValue({ ok: false, error: "Soumission impossible." });
    render(<ExamFlow {...PROPS} questionCount={2} timeLimitMinutes={1} />);

    fireEvent.click(button("Commencer l'examen"));
    await settle();
    tick(60 * SECOND);
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledTimes(1);
    expect(m.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toBe("Soumission impossible.");

    // The clock stays at zero: no copy sent again, no refresh, every second.
    tick(10 * SECOND);
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledTimes(1);
    expect(m.refresh).toHaveBeenCalledTimes(1);

    // Sent again by hand, from the first question: time is up.
    m.submitQuizAttempt.mockResolvedValue({
      ok: true,
      score: 0,
      passed: false,
      results: [],
      cooldownUntil: null,
    });
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Seuil non atteint.")).toBeTruthy();
  });

  it("names the day the wait ends on the rules, once in the browser", () => {
    const until = NOW + 30 * 60 * 60 * SECOND;
    render(<ExamFlow {...PROPS} cooldownUntilMs={until} />);

    expect(button("Commencer l'examen")).toHaveProperty("disabled", true);
    expect(
      screen.getByText(
        `Examen déjà passé récemment : nouvelle tentative possible le ${unlockDateLabel(until)}.`,
      ),
    ).toBeTruthy();
  });

  it("leaves the date out of the server's render, which knows no reader's clock", () => {
    const html = renderToStaticMarkup(
      <ExamFlow {...PROPS} cooldownUntilMs={NOW + 30 * 60 * 60 * SECOND} />,
    );

    expect(html).toContain("réessaie après le délai");
    expect(html).not.toContain("nouvelle tentative possible");
  });
});

/**
 * The final exam when the call itself fails: the network drops as the copy is
 * handed in. The screen used to stay on "Envoi…" with nothing to press, the
 * clock running, and a reload gave back the attempt with every answer gone.
 */
describe("ExamFlow when the network fails", () => {
  const option = (id: string) => ({ id, text: id.toUpperCase() + id });
  const TWO_QUESTIONS = {
    ok: true,
    attemptId: "a1",
    questions: [
      { id: "q1", question: "Première ?", options: [option("a"), option("b")] },
      { id: "q2", question: "Seconde ?", options: [option("c"), option("d")] },
    ],
    startedAt: new Date(NOW),
  };
  const PASSED = { ok: true, score: 100, passed: true, results: [] };
  const PROPS_2 = { ...PROPS, questionCount: 2 };

  /** Opens the copy and answers both questions: A, then D. */
  async function answerBoth(): Promise<void> {
    fireEvent.click(button("Commencer l'examen"));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /^A\s*Aa/ }));
    fireEvent.click(screen.getByTitle("Question 02"));
    fireEvent.click(screen.getByRole("button", { name: /^B\s*Dd/ }));
  }

  const selected = (): string[] =>
    [...document.querySelectorAll(".q-opt.is-selected .q-opt__text")].map(
      (element) => element.textContent,
    );

  it("says the hand-in failed, keeps the answers and the button, and hands them in again", async () => {
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    m.submitQuizAttempt.mockRejectedValueOnce(new Error("Failed to fetch"));
    render(<ExamFlow {...PROPS_2} />);
    await answerBoth();

    fireEvent.click(button("Terminer l'examen"));
    await settle();

    expect(screen.getByRole("alert").textContent).toBe(SUBMIT_FAILED);
    // Not stuck on "Envoi…": the button is back, enabled, to try again.
    expect(button("Terminer l'examen")).toHaveProperty("disabled", false);
    expect(screen.queryByText("Envoi…")).toBeNull();
    // The answers are all still there, on the question shown and on the first.
    expect(selected()).toEqual(["Dd"]);
    fireEvent.click(screen.getByTitle("Question 01"));
    expect(selected()).toEqual(["Aa"]);

    m.submitQuizAttempt.mockResolvedValueOnce(PASSED);
    fireEvent.click(screen.getByTitle("Question 02"));
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledTimes(2);
    expect(m.submitQuizAttempt).toHaveBeenLastCalledWith("a1", { q1: "a", q2: "d" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Examen validé.")).toBeTruthy();
  });

  it("clears the failure when the next hand-in starts", async () => {
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    m.submitQuizAttempt.mockRejectedValueOnce(new Error("Failed to fetch"));
    render(<ExamFlow {...PROPS_2} />);
    await answerBoth();
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(screen.getByRole("alert")).toBeTruthy();

    m.submitQuizAttempt.mockReturnValueOnce(new Promise(() => undefined));
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Envoi…")).toBeTruthy();
  });

  it("tries the hand-in at zero once, then leaves the retry to the reader", async () => {
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    m.submitQuizAttempt.mockRejectedValue(new Error("Failed to fetch"));
    render(<ExamFlow {...PROPS_2} timeLimitMinutes={1} />);
    await answerBoth();

    tick(60 * SECOND);
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toBe(SUBMIT_FAILED);

    // No request every second until the rate limit refuses.
    tick(10 * SECOND);
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledTimes(1);

    // The call failing is not the server refusing the copy: nothing to read again.
    expect(m.refresh).not.toHaveBeenCalled();

    // Time is up, so the button is on every question, and the answers are in it.
    m.submitQuizAttempt.mockResolvedValue(PASSED);
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenLastCalledWith("a1", { q1: "a", q2: "d" });
  });

  it("gives the rules back, with their button, when the start fails", async () => {
    m.startQuizAttempt.mockRejectedValueOnce(new Error("Failed to fetch"));
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    render(<ExamFlow {...PROPS_2} />);

    fireEvent.click(button("Commencer l'examen"));
    await settle();
    expect(screen.getByText(START_FAILED)).toBeTruthy();
    expect(button("Commencer l'examen")).toHaveProperty("disabled", false);

    fireEvent.click(button("Commencer l'examen"));
    await settle();
    expect(screen.getByText("Première ?")).toBeTruthy();
  });

  it("keeps a running attempt's own start when taking it up again after a failure", async () => {
    // Started ten minutes ago: twenty are left, whenever the reader tries again.
    const startedAt = NOW - 10 * 60 * SECOND;
    m.startQuizAttempt.mockRejectedValueOnce(new Error("Failed to fetch"));
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    render(<ExamFlow {...PROPS_2} resumeStartedAtMs={startedAt} />);
    await settle();
    expect(screen.getByText(START_FAILED)).toBeTruthy();

    tick(5 * SECOND);
    fireEvent.click(button("Commencer l'examen"));
    await settle();
    expect(document.querySelector(".q-timer__val")?.textContent).toBe("19:55");
  });

  it("takes an attempt up again after a reload with the answers it had", async () => {
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    const first = render(<ExamFlow {...PROPS_2} />);
    await answerBoth();
    expect(window.localStorage.getItem(draftKey("exam", "a1"))).not.toBeNull();

    // The page is reloaded: nothing of the screen's state is left.
    first.unmount();
    render(<ExamFlow {...PROPS_2} resumeStartedAtMs={NOW} />);
    await settle();

    expect(selected()).toEqual(["Aa"]);
    fireEvent.click(screen.getByTitle("Question 02"));
    expect(selected()).toEqual(["Dd"]);
    m.submitQuizAttempt.mockResolvedValue(PASSED);
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledWith("a1", { q1: "a", q2: "d" });
  });

  it("does not hand back an answer the attempt cannot take", async () => {
    window.localStorage.setItem(
      draftKey("exam", "a1"),
      JSON.stringify({ v: 1, savedAt: NOW, answers: { q1: "zzz", q9: "a", q2: "c" } }),
    );
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    render(<ExamFlow {...PROPS_2} resumeStartedAtMs={NOW} />);
    await settle();

    // The server would refuse the whole copy for one answer it does not know.
    expect(selected()).toEqual([]);
    fireEvent.click(screen.getByTitle("Question 02"));
    expect(selected()).toEqual(["Cc"]);
  });

  it("drops the answers kept once the copy is in", async () => {
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    m.submitQuizAttempt.mockResolvedValue(PASSED);
    render(<ExamFlow {...PROPS_2} />);
    await answerBoth();
    expect(window.localStorage.getItem(draftKey("exam", "a1"))).not.toBeNull();

    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(window.localStorage.getItem(draftKey("exam", "a1"))).toBeNull();
  });

  it("keeps the answers on the device when the server refuses the copy, to try again", async () => {
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    m.submitQuizAttempt.mockResolvedValue({ ok: false, error: "Trop de soumissions." });
    render(<ExamFlow {...PROPS_2} />);
    await answerBoth();

    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(screen.getByRole("alert").textContent).toBe("Trop de soumissions.");
    expect(window.localStorage.getItem(draftKey("exam", "a1"))).not.toBeNull();
  });

  it("goes on without a draft when the browser refuses localStorage", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    m.startQuizAttempt.mockResolvedValue(TWO_QUESTIONS);
    m.submitQuizAttempt.mockResolvedValue(PASSED);
    render(<ExamFlow {...PROPS_2} />);
    await answerBoth();
    fireEvent.click(button("Terminer l'examen"));
    await settle();

    expect(m.submitQuizAttempt).toHaveBeenCalledWith("a1", { q1: "a", q2: "d" });
    vi.restoreAllMocks();
  });
});
