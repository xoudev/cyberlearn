// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PickableLesson } from "../path-builder";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../_actions/class-path-actions", () => ({
  createClassPathAction: vi.fn(),
  updateClassPathAction: vi.fn(),
}));

const { PathBuilder } = await import("../path-builder");
const lessons: PickableLesson[] = [
  {
    id: "network",
    title: "Lire un paquet",
    category: "NETWORK",
    search: "lire un paquet",
    own: false,
  },
  { id: "python", title: "Les variables", category: "DEV", search: "les variables", own: true },
];

afterEach(cleanup);

function selection(container: HTMLElement): FormDataEntryValue | null {
  const form = container.querySelector("form");
  if (!form) throw new Error("Path form missing");
  return new FormData(form).get("lessonIds");
}

describe("the class path's ordered selection", () => {
  it("keeps publication disabled until a lesson is selected", () => {
    const { container } = render(
      <PathBuilder mode="create" classId="class" className="SIO" lessons={lessons} />,
    );
    expect(screen.getByRole("button", { name: "Publier pour SIO" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Lire un paquet" }));
    expect(selection(container)).toBe("network");
    expect(screen.getByRole("button", { name: "Publier pour SIO" }).hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.queryByRole("button", { name: "Ajouter Lire un paquet" })).toBeNull();
  });

  it("serializes the reordered lessons and returns a removed lesson to the catalogue", () => {
    const { container } = render(
      <PathBuilder mode="create" classId="class" className="SIO" lessons={lessons} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Lire un paquet" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Les variables" }));
    fireEvent.click(screen.getByRole("button", { name: "Monter Les variables" }));
    expect(selection(container)).toBe("python,network");
    fireEvent.click(screen.getByRole("button", { name: "Retirer Lire un paquet" }));
    expect(selection(container)).toBe("python");
    expect(screen.getByRole("button", { name: "Ajouter Lire un paquet" })).toBeDefined();
  });

  it("keeps the existing order while search narrows the available lessons", () => {
    const { container } = render(
      <PathBuilder
        mode="edit"
        pathId="path"
        className="SIO"
        lessons={lessons}
        draft={{
          title: "Réseaux",
          description: "Des leçons pour apprendre",
          category: "NETWORK",
          difficulty: "BEGINNER",
          estimatedHours: 2,
          lessonIds: ["network"],
        }}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Chercher une leçon" }), {
      target: { value: "introuvable" },
    });
    expect(selection(container)).toBe("network");
    expect(screen.getByText("Rien ne correspond.")).toBeDefined();
    fireEvent.change(screen.getByRole("searchbox", { name: "Chercher une leçon" }), {
      target: { value: "variables" },
    });
    expect(screen.getByRole("button", { name: "Ajouter Les variables" })).toBeDefined();
    expect(selection(container)).toBe("network");
  });
});
