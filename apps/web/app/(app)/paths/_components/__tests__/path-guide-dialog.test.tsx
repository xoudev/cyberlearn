// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SuggestedPath } from "@/lib/paths/guide-answers";
import { readGuideForm } from "@/lib/paths/guide-answers";
import { PathGuideDialog } from "../path-guide-dialog";

/**
 * The path guide is a window over the catalogue: it opens in place, asks its
 * two questions and suggests from the paths the page already has, without a
 * page or a request of its own.
 */

const CATALOGUE: SuggestedPath[] = [
  {
    slug: "reseaux-tcp-ip",
    title: "Réseaux TCP/IP",
    description: "",
    category: "NETWORK",
    track: "SKILL",
    difficulty: "BEGINNER",
    estimatedHours: 8,
    refCode: "CL-PATH-004",
    avgRating: 4.5,
    lessonCount: 12,
  },
  {
    slug: "python-debutant",
    title: "Python pour débuter",
    description: "",
    category: "DEV",
    track: "SKILL",
    difficulty: "BEGINNER",
    estimatedHours: 10,
    refCode: "CL-PATH-001",
    avgRating: null,
    lessonCount: 9,
  },
];

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function openGuide(saved = {}): void {
  render(<PathGuideDialog catalogue={CATALOGUE} saved={saved} />);
  fireEvent.click(screen.getByRole("button", { name: /Pas sûr de par où commencer/ }));
}

describe("the path guide's window", () => {
  it("opens over the page from its banner, and closes on Escape", () => {
    render(<PathGuideDialog catalogue={CATALOGUE} saved={{}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Pas sûr de par où commencer/ }));
    expect(screen.getByRole("dialog", { name: "Trouver ton parcours" })).toBeTruthy();
    expect(screen.getByText("Qu'est-ce qui t'amène ?")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("suggests from the catalogue it was given, each path linked", () => {
    openGuide();
    fireEvent.click(screen.getByRole("checkbox", { name: /Comprendre les réseaux/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Je débute complètement/ }));
    fireEvent.click(screen.getByRole("button", { name: /Voir mes suggestions/ }));
    const link = screen.getByRole("link", { name: /Voir ce parcours/ });
    expect(link.getAttribute("href")).toBe("/paths/reseaux-tcp-ip");
    expect(screen.getByText("Réseaux TCP/IP")).toBeTruthy();
    expect(screen.getByText(/Tu as répondu/)).toBeTruthy();
  });

  it("says which question is missing instead of suggesting", () => {
    openGuide();
    fireEvent.click(screen.getByRole("radio", { name: /Je débute complètement/ }));
    fireEvent.click(screen.getByRole("button", { name: /Voir mes suggestions/ }));
    expect(screen.getByRole("alert").textContent).toContain(
      "Coche au moins une réponse à la première question.",
    );
    expect(screen.queryByRole("link", { name: /Voir ce parcours/ })).toBeNull();
  });

  it("goes back to the questions with the answers ticked", () => {
    openGuide({ goals: ["NETWORK"], level: "NEW" });
    const network = screen.getByRole("checkbox", { name: /Comprendre les réseaux/ });
    expect(network instanceof HTMLInputElement && network.checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Voir mes suggestions/ }));
    fireEvent.click(screen.getByRole("button", { name: "Modifier mes réponses" }));
    const again = screen.getByRole("checkbox", { name: /Comprendre les réseaux/ });
    expect(again instanceof HTMLInputElement && again.checked).toBe(true);
  });
});

describe("the guide's form, read", () => {
  it("keeps the valid answers and says what is missing", () => {
    const form = new FormData();
    form.append("goals", "NETWORK");
    form.append("goals", "NOPE");
    const view = readGuideForm(form);
    expect(view.answers).toBeNull();
    expect(view.draft).toEqual({ goals: ["NETWORK"] });
    expect(view.error).toBe("Choisis ton point de départ, à la deuxième question.");

    form.append("level", "NEW");
    expect(readGuideForm(form).answers).toEqual({ goals: ["NETWORK"], level: "NEW" });
  });
});
