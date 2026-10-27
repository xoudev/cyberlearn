// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test/match-media";
import type { CompleteLessonResult } from "../../_actions/track-progress";
import { LessonCompleteModal } from "../lesson-complete-modal";

const result: CompleteLessonResult = {
  alreadyCompleted: false,
  xpGained: 100,
  leveledUp: false,
  newLevel: 2,
  newBadges: [],
  quizScore: { correct: 2, total: 3 },
};

beforeEach(() => {
  stubMatchMedia((query) => query.includes("prefers-reduced-motion"));
});
afterEach(cleanup);

describe("LessonCompleteModal", () => {
  it("shows the credited XP immediately with reduced motion and keeps the quiz result", () => {
    const close = vi.fn();
    render(<LessonCompleteModal result={result} lessonTitle="Les protocoles" onClose={close} />);
    expect(screen.getByText("+100")).toBeTruthy();
    expect(screen.getByText("2/3 bonnes réponses")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voir mon profil" }).getAttribute("href")).toBe(
      "/profile",
    );
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("gives the quiz's real score as a share, and the level the reader is at", () => {
    render(<LessonCompleteModal result={result} lessonTitle="Les protocoles" onClose={vi.fn()} />);
    // A no-break space before the sign, which the matcher reads as a space.
    expect(screen.getByText("67 %")).toBeTruthy();
    expect(screen.getByText("Niv. 2")).toBeTruthy();
    expect(screen.queryByText("Niveau 2 atteint")).toBeNull();
  });

  it("says nothing of a quiz the lesson does not have, and names a level reached", () => {
    render(
      <LessonCompleteModal
        result={{ ...result, quizScore: null, leveledUp: true, newLevel: 3 }}
        lessonTitle="Les protocoles"
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Quiz de la leçon")).toBeNull();
    expect(screen.getByText("Niveau 3 atteint")).toBeTruthy();
  });

  it("goes on to the bar under the lesson, which names what comes next", () => {
    const close = vi.fn();
    const next = document.createElement("section");
    next.id = "lesson-next";
    next.tabIndex = -1;
    const scrollIntoView = vi.fn();
    next.scrollIntoView = scrollIntoView;
    document.body.append(next);
    vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
      run(0);
      return 0;
    });
    try {
      render(<LessonCompleteModal result={result} lessonTitle="Les protocoles" onClose={close} />);
      fireEvent.click(screen.getByRole("button", { name: "Voir la suite" }));
      expect(close).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(next);
      // Reduced motion (beforeEach): no glide to it.
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
    } finally {
      vi.unstubAllGlobals();
      next.remove();
    }
  });

  it("keeps the total award unchanged while listing a badge and its own reward", () => {
    render(
      <LessonCompleteModal
        result={{ ...result, newBadges: [{ name: "Premier pas", rarity: "RARE", xpReward: 20 }] }}
        lessonTitle="Les protocoles"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("+100")).toBeTruthy();
    expect(screen.getByText("+20 XP")).toBeTruthy();
    expect(screen.getByText("Premier pas")).toBeTruthy();
    expect(screen.queryByText("+120")).toBeNull();
    expect(screen.getByRole("link", { name: "Voir mes badges" }).getAttribute("href")).toBe(
      "/profile?tab=badges",
    );
  });
});
