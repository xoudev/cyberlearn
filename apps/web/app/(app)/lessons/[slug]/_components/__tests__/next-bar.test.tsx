// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextBar } from "../next-bar";

/**
 * The bar under a lesson: where the reader goes once it is read.
 *
 * It used to carry a "Marquer terminé" under every section, which completed
 * the lesson from the first one: unread, its quizzes unanswered, while the
 * toolbar said an exercise held the way. The toolbar's "Terminer", at the end
 * of the last section, is the one way to finish a lesson.
 */

const NEXT = {
  slug: "reseau-ports",
  title: "Les ports",
  difficulty: "BEGINNER",
  category: "NETWORK",
  xpReward: 40,
  estimatedMinutes: 15,
};
const PLACEMENT = { path: { slug: "reseau", title: "Réseau" }, rank: 2, total: 6 };

afterEach(cleanup);

describe("the bar under a lesson", () => {
  it("does not finish the lesson: it has no button to", () => {
    render(<NextBar next={NEXT} placement={PLACEMENT} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/Marquer terminé|Valider la leçon/)).toBeNull();
  });

  it("does not finish it while the next lesson waits either", () => {
    render(<NextBar next={NEXT} placement={PLACEMENT} nextLocked />);
    expect(screen.queryByText(/Marquer terminé|Valider la leçon/)).toBeNull();
  });

  it("leads to the next lesson of the path", () => {
    render(<NextBar next={NEXT} placement={PLACEMENT} />);
    expect(screen.getByRole("link", { name: /Leçon suivante/ }).getAttribute("href")).toBe(
      "/lessons/reseau-ports",
    );
  });

  it("says the next lesson waits for this one, rather than lead to it", () => {
    // The link used to lead there anyway, and the lesson page sent the reader
    // back to the path map without a word.
    render(<NextBar next={NEXT} placement={PLACEMENT} nextLocked />);
    expect(screen.queryByRole("link", { name: /Leçon suivante/ })).toBeNull();
    const next = screen.getByRole<HTMLButtonElement>("button", { name: /Leçon suivante/ });
    expect(next.disabled).toBe(true);
    expect(screen.getByText("Termine cette leçon pour ouvrir la suivante.").id).toBe(
      next.getAttribute("aria-describedby"),
    );
  });
});
