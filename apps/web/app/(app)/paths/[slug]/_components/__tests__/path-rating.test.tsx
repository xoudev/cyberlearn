// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A path is rated with the lesson's widget, through the path's own action,
 * and without the lesson's card: it sits in a block of the side column that
 * already has a frame and an eyebrow.
 */

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

function renderRating(
  canRate: boolean,
  mine: { score: number; feedback: string } | null = null,
): HTMLElement {
  return render(
    <PathRating
      pathId={PATH}
      canRate={canRate}
      initialScore={mine?.score ?? null}
      initialFeedback={mine?.feedback ?? null}
      avgRating={4}
      ratingsCount={1}
    />,
  ).container;
}

async function send(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la note" }));
    await Promise.resolve();
  });
}

describe("PathRating", () => {
  it("says what unlocks it before a first mission is done", () => {
    renderRating(false);
    expect(screen.getByText("Termine une première mission pour noter ce parcours.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "4 étoiles" })).toBeNull();
  });

  it("has no frame or eyebrow of its own: the block's title is its heading", () => {
    const container = renderRating(false);
    expect(container.querySelector(".card")).toBeNull();
    expect(screen.queryByText("Évaluation")).toBeNull();
    const heading = screen.getByRole("heading", { name: "Note ce parcours" });
    expect(heading.className).toBe("ablock__title");
  });

  it("writes the average the French way under the title", () => {
    renderRating(false);
    expect(screen.getByText("4,0 · 1 avis")).toBeTruthy();
  });

  it("names the score under the stars", () => {
    renderRating(true);
    fireEvent.click(screen.getByRole("button", { name: "4 étoiles" }));
    expect(screen.getByText("Bien")).toBeTruthy();
    expect(screen.getByRole("button", { name: "4 étoiles" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("sends the note and the comment to the path, not to a lesson", async () => {
    renderRating(true);
    expect(screen.getByRole("heading", { name: "Note ce parcours" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "4 étoiles" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Il manque des exercices." },
    });
    await send();
    expect(ratePathAction).toHaveBeenCalledWith(PATH, 4, "Il manque des exercices.");
    expect(rateLessonAction).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Ta note a été enregistrée" })).toBeTruthy();
    expect(screen.getByText("4,5 · 2 avis")).toBeTruthy();
    expect(screen.getByText("Il manque des exercices.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("reopens a saved note with its comment on « Modifier »", () => {
    renderRating(true, { score: 3, feedback: "Trop court." });
    expect(screen.getByRole("heading", { name: "Ta note a été enregistrée" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    expect(screen.getByRole("textbox")).toBe(screen.getByDisplayValue("Trop court."));
    expect(screen.getByRole("button", { name: "Envoyer la note" })).toBeTruthy();
  });

  it("takes a new score on a saved note as a note to send again", async () => {
    renderRating(true, { score: 3, feedback: "Trop court." });
    fireEvent.click(screen.getByRole("button", { name: "5 étoiles" }));
    expect(screen.getByRole("heading", { name: "Note ce parcours" })).toBeTruthy();
    await send();
    expect(ratePathAction).toHaveBeenCalledWith(PATH, 5, "Trop court.");
  });

  it("shows the server's refusal", async () => {
    ratePathAction.mockResolvedValue({ ok: false, error: "Parcours introuvable." });
    renderRating(true);
    fireEvent.click(screen.getByRole("button", { name: "2 étoiles" }));
    await send();
    expect(screen.getByRole("alert").textContent).toBe("Parcours introuvable.");
  });
});
