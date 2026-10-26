// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The lesson's Q&A forms call server actions inside a transition. A call that
 * throws (network cut, server error) must be said in the form, with what was
 * typed kept, instead of reaching the error boundary and replacing the lesson.
 */

const m = vi.hoisted(() => ({
  postQuestion: vi.fn(),
  postAnswer: vi.fn(),
  acceptAnswer: vi.fn(),
  upvote: vi.fn(),
}));

vi.mock("../../_actions/qa-actions", () => ({
  postQuestionAction: m.postQuestion,
  postAnswerAction: m.postAnswer,
  acceptAnswerAction: m.acceptAnswer,
  upvoteAnswerAction: m.upvote,
}));

const { PostQuestionForm, PostAnswerForm, UpvoteButton } = await import("../qa-forms");

const LESSON = "11111111-1111-4111-8111-111111111111";
const QUESTION = "22222222-2222-4222-8222-222222222222";
const ANSWER = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe("PostQuestionForm", () => {
  function fillAndSubmit(): void {
    fireEvent.click(screen.getByRole("button", { name: /Poser une question/ }));
    fireEvent.change(screen.getByPlaceholderText(/Titre de ta question/), {
      target: { value: "Pourquoi le chiffrement est-il symétrique ?" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Décris ta question/), {
      target: { value: "Je ne comprends pas la différence avec l'asymétrique." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publier la question" }));
  }

  it("says the question was not sent, and keeps what was typed, when the call fails", async () => {
    m.postQuestion.mockRejectedValueOnce(new Error("network"));
    render(<PostQuestionForm lessonId={LESSON} />);
    fillAndSubmit();

    expect(await screen.findByText("Question non envoyée, réessaie.")).toBeTruthy();
    // The form stays open with both fields as they were, ready for another try.
    expect(screen.getByDisplayValue("Pourquoi le chiffrement est-il symétrique ?")).toBeTruthy();
    expect(
      screen.getByDisplayValue("Je ne comprends pas la différence avec l'asymétrique."),
    ).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Publier la question" }).hasAttribute("disabled"),
      ).toBe(false);
    });

    m.postQuestion.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByRole("button", { name: "Publier la question" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Poser une question/ })).toBeTruthy();
    });
    expect(m.postQuestion).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Question non envoyée, réessaie.")).toBeNull();
  });

  it("still shows the reason the server gives when it refuses the question", async () => {
    m.postQuestion.mockResolvedValueOnce({ success: false, error: "Titre trop court." });
    render(<PostQuestionForm lessonId={LESSON} />);
    fillAndSubmit();
    expect(await screen.findByText("Titre trop court.")).toBeTruthy();
  });
});

describe("PostAnswerForm", () => {
  function fillAndSubmit(): void {
    fireEvent.click(screen.getByRole("button", { name: "Répondre" }));
    fireEvent.change(screen.getByPlaceholderText(/Ta réponse/), {
      target: { value: "La clé est la même des deux côtés." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));
  }

  it("says the answer was not sent, and keeps what was typed, when the call fails", async () => {
    m.postAnswer.mockRejectedValueOnce(new Error("network"));
    render(<PostAnswerForm questionId={QUESTION} />);
    fillAndSubmit();

    expect(await screen.findByText("Réponse non envoyée, réessaie.")).toBeTruthy();
    expect(screen.getByDisplayValue("La clé est la même des deux côtés.")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Publier" }).hasAttribute("disabled")).toBe(false);
    });

    m.postAnswer.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Répondre" })).toBeTruthy();
    });
    expect(m.postAnswer).toHaveBeenCalledTimes(2);
    expect(m.postAnswer).toHaveBeenLastCalledWith(QUESTION, "La clé est la même des deux côtés.");
  });
});

describe("UpvoteButton", () => {
  function renderButton(): void {
    render(<UpvoteButton answerId={ANSWER} lessonSlug="chiffrement" upvotes={3} />);
  }

  it("counts the vote once the server has it", async () => {
    m.upvote.mockResolvedValueOnce({ success: true });
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    const voted = await screen.findByRole("button", { name: "4" });
    expect(voted.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(m.upvote).toHaveBeenCalledWith(ANSWER, "chiffrement");
  });

  it("says the vote was not recorded, and frees the button, when the call fails", async () => {
    m.upvote.mockRejectedValueOnce(new Error("network"));
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Vote non enregistré, réessaie.");
    // No vote is claimed: the count is the old one and the button is back.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "3" }).hasAttribute("disabled")).toBe(false);
    });

    m.upvote.mockResolvedValueOnce({ success: true });
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(await screen.findByRole("button", { name: "4" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
