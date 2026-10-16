// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonHeader } from "../lesson-header";

/**
 * The top of a lesson: the breadcrumb, the title, the lede and four facts.
 * It replaced a breadcrumb card, an 80px title and a "mission briefing" card
 * that said the same facts again; nothing it said is lost, nothing is said
 * twice.
 */

afterEach(cleanup);

function header(overrides: Partial<React.ComponentProps<typeof LessonHeader>> = {}): void {
  render(
    <LessonHeader
      title="Les ports et les services"
      description="Ce qui écoute sur une machine, et comment le voir."
      slug="ports-et-services"
      category="NETWORK"
      difficulty="INTERMEDIATE"
      estimatedMinutes={25}
      xpReward={60}
      isCompleted={false}
      reviewing={false}
      {...overrides}
    />,
  );
}

function chips(): string[] {
  const list = screen.getByRole("list", { name: "La leçon en bref" });
  return within(list)
    .getAllByRole("listitem")
    .map((chip) => chip.textContent);
}

describe("the lesson header", () => {
  it("leads back to the catalogue and to the lesson's domain", () => {
    header();
    expect(screen.getByRole("link", { name: "leçons" }).getAttribute("href")).toBe("/lessons");
    expect(screen.getByRole("link", { name: "network" }).getAttribute("href")).toBe(
      "/lessons?category=NETWORK",
    );
    expect(screen.getByText("ports-et-services")).toBeTruthy();
  });

  it("titles the page with the lesson, and says what it is about", () => {
    header();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Les ports et les services.",
    );
    expect(screen.getByText("Ce qui écoute sur une machine, et comment le voir.")).toBeTruthy();
  });

  it("adds no full stop to a title that ends on its own punctuation", () => {
    header({ title: "Bilan du module 4 : que se passe-t-il quand on ouvre une page web ?" });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Bilan du module 4 : que se passe-t-il quand on ouvre une page web ?",
    );
    cleanup();
    header({ title: "Pourquoi chiffrer !" });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Pourquoi chiffrer !");
    cleanup();
    header({ title: "Les bases." });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Les bases.");
  });

  it("gives its length, its XP, its difficulty and how far the reader is, once each", () => {
    header();
    expect(chips()).toEqual(["25 min", "+60 XP", "Intermédiaire", "En cours"]);
  });

  it("says when the reader has finished it", () => {
    header({ isCompleted: true });
    expect(chips().at(-1)).toBe("Terminée");
  });

  it("warns an administrator that the lesson is not published", () => {
    header();
    expect(screen.queryByRole("status")).toBeNull();
    cleanup();
    header({ reviewing: true });
    expect(screen.getByRole("status").textContent).toContain("Aperçu administrateur.");
  });

  it("draws no progress of its own: the toolbar has the one count", () => {
    header();
    expect(document.body.textContent).not.toMatch(/mission briefing|sections?\b/i);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
