// @vitest-environment jsdom
import React from "react";
import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecallAnswerResult, RecallView } from "@/lib/revisions/daily-recall";

// Each case walks several server round trips (open, answer, read back) through
// the lazy window. Beside the other suites in CI that ran past the default
// second of findBy and waitFor, while it takes a fraction of it alone.
configure({ asyncUtilTimeout: 5_000 });

/**
 * The review window: one question at a time, the verdict with the
 * explanation and the way back to the passage, the end with its XP; the day's
 * recall taken up where it was left, a module's review without XP.
 */

const m = vi.hoisted(() => ({
  openDailyRecallAction: vi.fn<() => Promise<RecallView>>(),
  openModuleReviewAction: vi.fn<(input: unknown) => Promise<RecallView>>(),
  answerDailyRecallAction: vi.fn<(input: unknown) => Promise<RecallAnswerResult>>(),
  answerModuleReviewAction: vi.fn<(input: unknown) => Promise<RecallAnswerResult>>(),
}));

vi.mock("@/app/(app)/_rappel/_actions/rappel-actions", () => m);

const { default: RappelDialog } = await import("../rappel-dialog");

const LESSON = "22222222-2222-4222-8222-222222222222";

const QUESTIONS = [
  {
    index: 0,
    lessonId: LESSON,
    quizId: "q-1",
    lessonTitle: "Les droits",
    question: "Que donne chmod 600 ?",
    options: ["rwx --- ---", "rw- --- ---", "r-- r-- r--"],
  },
  {
    index: 1,
    lessonId: LESSON,
    quizId: "q-2",
    lessonTitle: "Les droits",
    question: "Quelle commande change le groupe ?",
    options: ["chmod", "chgrp"],
  },
];

const PASSAGE = { lessonTitle: "Les droits", href: "/lessons/linux-droits?section=1#quiz-q-1" };

function view(overrides: Partial<RecallView> = {}): RecallView {
  return {
    mode: "daily",
    status: "open",
    day: "2026-10-17",
    title: "Rappel du jour",
    module: null,
    questions: QUESTIONS,
    verdicts: [],
    result: null,
    ...overrides,
  };
}

function verdict(index: number, selected: number, correctIndex: number) {
  return {
    index,
    selected,
    correct: selected === correctIndex,
    correctIndex,
    explanation: index === 0 ? "6, c'est lecture et écriture." : null,
    passage: PASSAGE,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("RappelDialog, the day's recall", () => {
  it("asks one question at a time, then says what the answer was and why", async () => {
    m.openDailyRecallAction.mockResolvedValue(view());
    m.answerDailyRecallAction.mockResolvedValue({
      ok: true,
      verdict: verdict(0, 0, 1),
      result: null,
    });
    render(<RappelDialog value="1" onClose={vi.fn()} />);

    expect(await screen.findByText("Que donne chmod 600 ?")).toBeTruthy();
    expect(screen.getByText(/Question 1 sur 2/u)).toBeTruthy();
    expect(screen.queryByText("Quelle commande change le groupe ?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /rwx --- ---/u }));
    await screen.findByText("Raté. La bonne réponse : rw- --- ---.");
    expect(m.answerDailyRecallAction).toHaveBeenCalledWith({ index: 0, selected: 0 });
    expect(screen.getByText("6, c'est lecture et écriture.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Revoir ce passage/u }).getAttribute("href")).toBe(
      PASSAGE.href,
    );
    // Answered: no second answer.
    expect(screen.getByRole("button", { name: /r-- r-- r--/u }).hasAttribute("disabled")).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "Question suivante" }));
    expect(screen.getByText("Quelle commande change le groupe ?")).toBeTruthy();
    expect(screen.getByText(/Question 2 sur 2/u)).toBeTruthy();
  });

  it("ends on the score and the XP once the last answer hands the recall in", async () => {
    m.openDailyRecallAction.mockResolvedValue(view({ verdicts: [verdict(0, 1, 1)] }));
    m.answerDailyRecallAction.mockResolvedValue({
      ok: true,
      verdict: verdict(1, 0, 1),
      result: { correct: 1, total: 2, xp: 15 },
    });
    render(<RappelDialog value="1" onClose={vi.fn()} />);

    // Taken up where it was left: the first question is answered already.
    expect(await screen.findByText("Quelle commande change le groupe ?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /chmod/u }));
    fireEvent.click(await screen.findByRole("button", { name: "Voir le bilan" }));

    expect(screen.getByText("+15 XP")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("1 bonne réponse sur 2");
    expect(screen.getByRole("status").textContent).toContain("compte pour ta série");
  });

  it("shows a recall done today as its end, without asking again", async () => {
    m.openDailyRecallAction.mockResolvedValue(
      view({
        status: "done",
        verdicts: [verdict(0, 1, 1), verdict(1, 0, 1)],
        result: { correct: 1, total: 2, xp: 15 },
      }),
    );
    render(<RappelDialog value="1" onClose={vi.fn()} />);
    expect(await screen.findByText("+15 XP")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /chgrp/u })).toBeNull();
    // The question missed leads back to its passage.
    expect(screen.getAllByRole("link", { name: /Revoir ce passage/u })).toHaveLength(1);
  });

  it("says when there is nothing to ask today, and never how many wait", async () => {
    m.openDailyRecallAction.mockResolvedValue(view({ status: "empty", questions: [] }));
    render(<RappelDialog value="1" onClose={vi.fn()} />);
    const dialog = await screen.findByRole("dialog", { name: "Rappel du jour" });
    await waitFor(() => {
      expect(dialog.textContent).toContain("Rien à revoir aujourd'hui.");
    });
  });

  it("leads to the preferences when spaced repetition is off", async () => {
    m.openDailyRecallAction.mockResolvedValue(view({ status: "off", questions: [] }));
    render(<RappelDialog value="1" onClose={vi.fn()} />);
    const link = await screen.findByRole("link", { name: /Ouvrir les préférences/u });
    expect(link.getAttribute("href")).toBe("/settings/preferences");
  });

  it("shows the verdict of a question answered elsewhere, and goes on", async () => {
    // Answered on the phone meanwhile: the server refuses this answer, and
    // the recall read back carries the one given there.
    m.openDailyRecallAction
      .mockResolvedValueOnce(view())
      .mockResolvedValueOnce(view({ verdicts: [verdict(0, 1, 1)] }));
    m.answerDailyRecallAction.mockResolvedValue({
      ok: false,
      error: "Tu as déjà répondu à cette question.",
    });
    render(<RappelDialog value="1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /rwx --- ---/u }));

    expect(await screen.findByText("Bonne réponse.")).toBeTruthy();
    expect(m.openDailyRecallAction).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert").textContent).toBe("Tu as déjà répondu à cette question.");
    expect(screen.getByText("Que donne chmod 600 ?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /rw- --- ---/u }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Question suivante" }));
    expect(screen.getByText("Quelle commande change le groupe ?")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("goes on to the next question when the one answered is gone from its lesson", async () => {
    m.openDailyRecallAction
      .mockResolvedValueOnce(view())
      .mockResolvedValueOnce(view({ questions: QUESTIONS.slice(1) }));
    m.answerDailyRecallAction.mockResolvedValue({
      ok: false,
      error: "Cette question n'est plus disponible.",
    });
    render(<RappelDialog value="1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /rwx --- ---/u }));

    expect(await screen.findByText("Quelle commande change le groupe ?")).toBeTruthy();
    expect(screen.getByText(/Question 1 sur 1/u)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Cette question n'est plus disponible.");
  });

  it("lets the reader answer again a question whose answer was not taken", async () => {
    m.openDailyRecallAction.mockResolvedValue(view());
    m.answerDailyRecallAction
      .mockResolvedValueOnce({ ok: false, error: "Réponse invalide." })
      .mockResolvedValueOnce({ ok: true, verdict: verdict(0, 1, 1), result: null });
    render(<RappelDialog value="1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /rwx --- ---/u }));
    expect((await screen.findByRole("alert")).textContent).toBe("Réponse invalide.");
    await waitFor(() => {
      expect(m.openDailyRecallAction).toHaveBeenCalledTimes(2);
    });

    const option = screen.getByRole("button", { name: /rw- --- ---/u });
    await waitFor(() => {
      expect(option.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(option);
    expect(await screen.findByText("Bonne réponse.")).toBeTruthy();
  });

  it("offers to try again when the recall cannot be loaded", async () => {
    m.openDailyRecallAction.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(view());
    render(<RappelDialog value="1" onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Que donne chmod 600 ?")).toBeTruthy();
  });
});

describe("RappelDialog, a module's review", () => {
  it("asks the module's questions, checks each one with its day, and earns no XP", async () => {
    m.openModuleReviewAction.mockResolvedValue(
      view({
        mode: "module",
        title: "Module 02 · Les droits",
        module: { path: "linux-fondamentaux", number: 2 },
        questions: QUESTIONS.slice(0, 1),
      }),
    );
    m.answerModuleReviewAction.mockResolvedValue({
      ok: true,
      verdict: verdict(0, 1, 1),
      result: null,
    });
    render(<RappelDialog value="module-2-linux-fondamentaux" onClose={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: "Module 02 · Les droits" })).toBeTruthy();
    expect(m.openModuleReviewAction).toHaveBeenCalledWith({
      path: "linux-fondamentaux",
      module: 2,
    });
    expect(m.openDailyRecallAction).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: /rw- --- ---/u }));
    await screen.findByText("Bonne réponse.");
    expect(m.answerModuleReviewAction).toHaveBeenCalledWith({
      path: "linux-fondamentaux",
      module: 2,
      day: "2026-10-17",
      index: 0,
      lessonId: LESSON,
      quizId: "q-1",
      selected: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "Voir le bilan" }));
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("1 bonne réponse sur 1");
    expect(status.textContent).toContain("sans XP");
    expect(screen.queryByText(/\+\d+ XP/u)).toBeNull();
  });

  it("sets aside a question it cannot check, and goes on without it", async () => {
    m.openModuleReviewAction.mockResolvedValue(
      view({
        mode: "module",
        title: "Module 02 · Les droits",
        module: { path: "linux-fondamentaux", number: 2 },
      }),
    );
    m.answerModuleReviewAction
      .mockResolvedValueOnce({ ok: false, error: "Cette question n'est plus disponible." })
      .mockResolvedValueOnce({ ok: true, verdict: verdict(1, 1, 1), result: null });
    render(<RappelDialog value="module-2-linux-fondamentaux" onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /rwx --- ---/u }));
    expect(await screen.findByText("Quelle commande change le groupe ?")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Cette question n'est plus disponible.");
    // Nothing on the server to read back.
    expect(m.openModuleReviewAction).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /chgrp/u }));
    fireEvent.click(await screen.findByRole("button", { name: "Voir le bilan" }));
    expect(screen.getByRole("status").textContent).toContain("1 bonne réponse sur 1");
  });
});
