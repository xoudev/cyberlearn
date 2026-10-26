// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Under a lesson, the rating is a card of its own; the average reads as the app writes it. */

const rateLessonAction = vi.fn();
vi.mock("../../_actions/rate-lesson", () => ({
  rateLessonAction: (...args: unknown[]) => rateLessonAction(...args) as unknown,
}));

const { LessonRating } = await import("../lesson-rating");

const LESSON = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  rateLessonAction.mockResolvedValue({ success: true, avgRating: 4.5, ratingsCount: 2 });
});
afterEach(() => {
  cleanup();
});

function renderRating(isCompleted: boolean, avgRating: number | null = 5): HTMLElement {
  return render(
    <LessonRating
      lessonId={LESSON}
      isCompleted={isCompleted}
      initialScore={null}
      initialFeedback={null}
      avgRating={avgRating}
      ratingsCount={avgRating === null ? 0 : 1}
    />,
  ).container;
}

describe("LessonRating", () => {
  it("is a card with its own eyebrow and title", () => {
    const container = renderRating(false);
    expect(container.querySelector(".card")).not.toBeNull();
    expect(screen.getByText("Évaluation")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Note cette leçon" })).toBeTruthy();
    expect(screen.getByText("Complète la leçon pour noter")).toBeTruthy();
  });

  it("writes the average the French way, the same as the app", () => {
    renderRating(false);
    expect(screen.getByText("5,0 · 1 avis")).toBeTruthy();
  });

  it("shows no average while nobody has rated", () => {
    renderRating(false, null);
    expect(screen.queryByText(/avis/)).toBeNull();
  });

  it("names the score and sends it to the lesson", async () => {
    renderRating(true);
    fireEvent.click(screen.getByRole("button", { name: "5 étoiles" }));
    expect(screen.getByText("Excellent")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer la note" }));
      await Promise.resolve();
    });
    expect(rateLessonAction).toHaveBeenCalledWith(LESSON, 5, undefined);
    expect(screen.getByRole("heading", { name: "Ta note a été enregistrée" })).toBeTruthy();
    expect(screen.getByText("4,5 · 2 avis")).toBeTruthy();
  });

  it("says the rating was not sent, and keeps the stars, when the call fails", async () => {
    rateLessonAction.mockRejectedValueOnce(new Error("network"));
    renderRating(true);
    fireEvent.click(screen.getByRole("button", { name: "4 étoiles" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer la note" }));
      await Promise.resolve();
    });
    expect((await screen.findByRole("alert")).textContent).toBe("Note non envoyée, réessaie.");
    // Nothing saved is claimed, and the button is back for another try.
    expect(screen.queryByRole("heading", { name: "Ta note a été enregistrée" })).toBeNull();
    expect(screen.getByRole("button", { name: "4 étoiles" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Envoyer la note" }).hasAttribute("disabled")).toBe(
      false,
    );
  });
});
