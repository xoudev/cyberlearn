// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PathsCollection, type SerializedPath } from "../paths-collection";

/**
 * The paths catalogue: every button leads where it says. "Continuer" picks the
 * path up at its next mission, "Voir le certificat" opens the certificate, and
 * an empty result can be cleared from where it is shown.
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
});
