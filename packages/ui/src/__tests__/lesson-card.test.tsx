import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonCard } from "../components/lesson-card.js";

/**
 * A completed lesson says how its quiz went: "3/5" beside "Terminé".
 *
 * Requested by a tester: with one attempt per question, the lessons of the
 * catalogue show which ones were understood and which to go back to.
 */

afterEach(() => {
  cleanup();
});

const BASE = {
  title: "Listes et tuples",
  slug: "python-listes-tuples",
  difficulty: "BEGINNER" as const,
  category: "DEV",
  xpReward: 50,
  variant: "catalog" as const,
};

describe("the quiz score on a catalogue card", () => {
  it("shows right answers out of the total on a completed lesson", () => {
    render(<LessonCard {...BASE} status="COMPLETED" quizScore={{ correct: 3, total: 5 }} />);
    expect(screen.getByTitle("Quiz : 3 bonnes réponses sur 5").textContent).toBe("Quiz : 3/5");
  });

  it("says it in the singular for one right answer", () => {
    render(<LessonCard {...BASE} status="COMPLETED" quizScore={{ correct: 1, total: 4 }} />);
    expect(screen.getByTitle("Quiz : 1 bonne réponse sur 4")).toBeTruthy();
  });

  it("shows nothing before the lesson is completed", () => {
    render(<LessonCard {...BASE} status="IN_PROGRESS" quizScore={{ correct: 3, total: 5 }} />);
    expect(screen.queryByText(/3\/5/)).toBeNull();
  });

  it("shows nothing for a lesson without a recorded score", () => {
    render(<LessonCard {...BASE} status="COMPLETED" quizScore={null} />);
    expect(screen.queryByTitle(/^Quiz/)).toBeNull();
  });
});
