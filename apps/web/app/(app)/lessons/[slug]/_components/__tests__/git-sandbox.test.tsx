// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GitSandbox } from "../git-sandbox";

/**
 * The sandbox as a learner drives it: type a command, read Git's answer, see
 * the checks tick and the graph follow.
 */

const PROPS = {
  id: "g",
  title: "Corriger sur une branche",
  setup: ["git init", "echo 'Bienvenu' > README.md", "git add .", 'git commit -m "README"'],
  checks: [
    {
      label: "README corrigé sur main",
      expect: "file",
      branch: "main",
      path: "README.md",
      contains: "Bienvenue",
    },
    { label: "fix supprimée", expect: "no-branch", branch: "fix" },
  ],
  hints: ["git switch -c fix"],
};

afterEach(cleanup);

function type(command: string): void {
  const input = screen.getByLabelText("Commande");
  fireEvent.change(input, { target: { value: command } });
  fireEvent.submit(input.closest("form") ?? input);
}

describe("GitSandbox", () => {
  it("starts from the setup, with the graph and nothing ticked", () => {
    render(<GitSandbox {...PROPS} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Graphe des commits : README (main)",
    );
    expect(screen.getByText("○ README corrigé sur main")).toBeTruthy();
    expect(screen.getByText("○ fix supprimée")).toBeTruthy();
  });

  it("answers as Git does, and ticks the checks as the work gets done", () => {
    render(<GitSandbox {...PROPS} />);
    type("git switch -c fix");
    expect(screen.getByText("Switched to a new branch 'fix'")).toBeTruthy();
    type("echo 'Bienvenue' > README.md && git commit -am \"Corrige\"");
    type("git switch main");
    type("git merge fix");
    // Testing Library reads the output's line breaks as spaces.
    expect(screen.getByText(/^Updating [0-9a-f]{7}\.\.[0-9a-f]{7} Fast-forward/u)).toBeTruthy();
    expect(screen.getByText("✓ README corrigé sur main")).toBeTruthy();
    type("git branch -d fix");
    expect(screen.getByText("✓ fix supprimée")).toBeTruthy();
    expect(
      screen.getByText("✓ Exercice complété : tout ce qui était demandé est fait."),
    ).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Graphe des commits : Corrige (main), puis README",
    );
  });

  it("shows a failed command in error, and brings a past command back with the up arrow", () => {
    render(<GitSandbox {...PROPS} />);
    type("git merge nowhere");
    expect(screen.getByText("merge: nowhere - not something we can merge")).toBeTruthy();
    const input = screen.getByLabelText<HTMLInputElement>("Commande");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("git merge nowhere");
  });

  it("lists the files Git sees changed, as git status --short", () => {
    render(<GitSandbox {...PROPS} />);
    type("echo 'x' > notes.txt");
    type("echo 'Bienvenue' > README.md");
    const files = screen.getByRole("list", { name: "Fichiers modifiés" });
    expect(files.textContent).toBe(" M README.md?? notes.txt");
  });

  it("says what is wrong with a sandbox rather than breaking the lesson", () => {
    render(<GitSandbox id="g" setup={["git init", "git commit -m vide"]} />);
    expect(screen.getByRole("note").textContent).toContain(
      "la commande de préparation « git commit -m vide » échoue",
    );
  });
});
