// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PathsCollection, type SerializedPath } from "../paths-collection";

/**
 * The paths catalogue: every button leads where it says. "Continuer" picks the
 * path up at its next mission, or its exam once they are done, on the hero as
 * on a second path's card; "Voir le certificat" opens the certificate, and a
 * filtered empty result can be cleared from where it is shown.
 */

function path(over: Partial<SerializedPath>): SerializedPath {
  return {
    id: "p1",
    slug: "python",
    refCode: "CL-PTH-001",
    title: "Python",
    description: "Les bases du langage.",
    category: "DEV",
    track: "SKILL",
    difficulty: "BEGINNER",
    estimatedHours: 8,
    xpTotal: 1200,
    lessonCount: 10,
    hasCert: true,
    hasQuiz: true,
    status: "idle",
    progressDone: 0,
    progressTotal: 10,
    rating: null,
    coverSrc: null,
    nextLesson: null,
    certPublicId: null,
    ...over,
  };
}

function renderCollection(paths: SerializedPath[]): void {
  render(
    <PathsCollection
      paths={paths}
      inProgCount={paths.filter((p) => p.status === "inprog").length}
      doneCount={paths.filter((p) => p.status === "done").length}
      totalXp={0}
      totalHours={0}
      guide={{ catalogue: [], saved: {} }}
    />,
  );
}

function hrefOf(name: string | RegExp): string | null {
  return screen.getByRole("link", { name }).getAttribute("href");
}

afterEach(() => {
  cleanup();
});

describe("PathsCollection", () => {
  it("resumes the path in progress at its next mission, and previews it apart", () => {
    renderCollection([
      path({
        status: "inprog",
        progressDone: 4,
        nextLesson: {
          n: "05",
          title: "Les fonctions",
          slug: "python-fonctions",
          xpReward: 50,
          estimatedMinutes: 20,
        },
      }),
    ]);
    expect(hrefOf(/Continuer le parcours/)).toBe("/lessons/python-fonctions");
    expect(hrefOf("Aperçu")).toBe("/paths/python");
  });

  it("leads to the final exam once every mission is done", () => {
    renderCollection([path({ status: "inprog", progressDone: 10, nextLesson: null })]);
    expect(hrefOf(/Passer l'examen final/)).toBe("/paths/python/exam");
    expect(hrefOf("Aperçu")).toBe("/paths/python");
    expect(screen.queryByRole("link", { name: /Continuer le parcours/ })).toBeNull();
  });

  it.each([
    ["no exam", path({ status: "inprog", progressDone: 10, nextLesson: null, hasQuiz: false })],
    ["no mission", path({ status: "inprog", lessonCount: 0, progressTotal: 0, nextLesson: null })],
  ])("opens a path with no next mission and %s from a single button", (_, inProgress) => {
    renderCollection([inProgress]);
    // "Aperçu" would open the same page: two buttons, one place.
    expect(hrefOf(/Voir le parcours/)).toBe("/paths/python");
    expect(screen.queryByRole("link", { name: "Aperçu" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Continuer le parcours/ })).toBeNull();
  });

  describe("a second path in progress", () => {
    const hero = path({
      status: "inprog",
      progressDone: 4,
      nextLesson: {
        n: "05",
        title: "Les fonctions",
        slug: "python-fonctions",
        xpReward: 50,
        estimatedMinutes: 20,
      },
    });
    const second = (over: Partial<SerializedPath>): SerializedPath =>
      path({ id: "p2", slug: "reseaux", title: "Réseaux", status: "inprog", ...over });

    it("continues at its next mission, and opens the path from the card", () => {
      renderCollection([
        hero,
        second({
          progressDone: 2,
          nextLesson: {
            n: "03",
            title: "Le modèle OSI",
            slug: "reseaux-osi",
            xpReward: 40,
            estimatedMinutes: 15,
          },
        }),
      ]);
      expect(hrefOf("Continuer")).toBe("/lessons/reseaux-osi");
      expect(hrefOf(/Réseaux/)).toBe("/paths/reseaux");
      // Two links side by side: one inside the other is invalid HTML.
      expect(document.querySelector("a a")).toBeNull();
    });

    it("leads to the final exam once its missions are done", () => {
      renderCollection([hero, second({ progressDone: 10, nextLesson: null })]);
      expect(hrefOf(/Passer l'examen final/)).toBe("/paths/reseaux/exam");
      expect(hrefOf(/Réseaux/)).toBe("/paths/reseaux");
      expect(screen.queryByRole("link", { name: "Continuer" })).toBeNull();
    });

    it("stays one link to the path with neither a mission nor an exam left", () => {
      renderCollection([hero, second({ progressDone: 10, nextLesson: null, hasQuiz: false })]);
      const card = screen.getByRole("link", { name: /Réseaux/ });
      expect(card.getAttribute("href")).toBe("/paths/reseaux");
      expect(card.textContent).toContain("Voir le parcours");
      const toPath = screen
        .getAllByRole("link")
        .filter((a) => a.getAttribute("href") === "/paths/reseaux");
      expect(toPath).toHaveLength(1);
      expect(screen.queryByRole("link", { name: "Continuer" })).toBeNull();
    });
  });

  it("opens the certificate of a certified path, and the path from the card", () => {
    renderCollection([
      path({ status: "done", progressDone: 10, certPublicId: "cert-1" }),
      path({ id: "p2", slug: "reseaux", title: "Réseaux", status: "done", progressDone: 10 }),
    ]);
    const certificates = screen.getAllByRole("link", { name: /Voir le certificat/ });
    expect(certificates.map((a) => a.getAttribute("href"))).toEqual([
      "/verify/cert-1",
      "/certificates",
    ]);
    expect(hrefOf(/Python/)).toBe("/paths/python");
  });

  it("clears every filter from the empty result", () => {
    renderCollection([path({})]);
    fireEvent.change(screen.getByPlaceholderText(/chercher un parcours/), {
      target: { value: "introuvable" },
    });
    expect(screen.getByText("Aucun parcours trouvé")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Voir tous les parcours" }));

    expect(screen.queryByText("Aucun parcours trouvé")).toBeNull();
    expect(screen.getByText("Python")).toBeTruthy();
    expect(screen.getByPlaceholderText(/chercher un parcours/)).toHaveProperty("value", "");
  });

  it("offers no reset when nothing is filtered, as there is nothing to clear", () => {
    renderCollection([]);
    expect(screen.getByText("Aucun parcours trouvé")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Voir tous les parcours" })).toBeNull();
    expect(document.querySelector(".empty-state__action")).toBeNull();
  });
});
