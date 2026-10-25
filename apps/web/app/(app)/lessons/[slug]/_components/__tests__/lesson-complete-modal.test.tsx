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
      "/badges",
    );
  });
});
