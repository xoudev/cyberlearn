// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A path is rated with the lesson's widget, through the path's own action. */

const ratePathAction = vi.fn();
vi.mock("../../_actions/rate-path", () => ({
  ratePathAction: (...args: unknown[]) => ratePathAction(...args) as unknown,
}));
const rateLessonAction = vi.fn();
vi.mock("../../../../lessons/[slug]/_actions/rate-lesson", () => ({
  rateLessonAction: (...args: unknown[]) => rateLessonAction(...args) as unknown,
}));

const { PathRating } = await import("../path-rating");

const PATH = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  ratePathAction.mockResolvedValue({ ok: true, avgRating: 4.5, ratingsCount: 2 });
});
afterEach(() => {
  cleanup();
});

function renderRating(canRate: boolean): void {
  render(
    <PathRating
      pathId={PATH}
      canRate={canRate}
      initialScore={null}
      initialFeedback={null}
      avgRating={4}
      ratingsCount={1}
    />,
  );
}

describe("PathRating", () => {
  it("says what unlocks it before a first mission is done", () => {
    renderRating(false);
    expect(screen.getByText("Termine une première mission pour noter ce parcours")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "4 étoiles" })).toBeNull();
  });

  it("sends the note and the comment to the path, not to a lesson", async () => {
    renderRating(true);
    expect(screen.getByText("Note ce parcours")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "4 étoiles" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Il manque des exercices." },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer la note" }));
      await Promise.resolve();
    });
    expect(ratePathAction).toHaveBeenCalledWith(PATH, 4, "Il manque des exercices.");
    expect(rateLessonAction).not.toHaveBeenCalled();
    expect(screen.getByText("Ta note a été enregistrée")).toBeTruthy();
    expect(screen.getByText("4.5")).toBeTruthy();
  });

  it("shows the server's refusal", async () => {
    ratePathAction.mockResolvedValue({ ok: false, error: "Parcours introuvable." });
    renderRating(true);
    fireEvent.click(screen.getByRole("button", { name: "2 étoiles" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer la note" }));
      await Promise.resolve();
    });
    expect(screen.getByText("Parcours introuvable.")).toBeTruthy();
  });
});
