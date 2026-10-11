// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { WorkerLike } from "@/lib/sql/sandbox";
import { GitSandbox } from "../git-sandbox";
import { JwtLab } from "../jwt-lab";
import { LAB_TRACK, labStack } from "../lab-stack";
import { PhpLab } from "../php-lab";
import { SqlPlayground } from "../sql-playground";

/**
 * A lab stacks its parts in a grid. Left without a column, a grid gets one
 * `auto` track, which grows to the widest line it holds however deep that
 * line sits: one line of code in a <details> pushed the whole JwtLab, and
 * every part of it, out of its frame. Each stack names its track instead,
 * and the labs are walked through to find any that does not.
 */

afterEach(cleanup);

/** The grids in `root` that name no column: each is one `auto` track. */
function implicitGrids(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>("*"))
    .filter((el) => el.style.display === "grid" && el.style.gridTemplateColumns === "")
    .map((el) => el.outerHTML.slice(0, 120));
}

/** A worker that answers every message the same way, on the next tick. */
function answering(data: (message: { id: number; action?: string }) => object): () => WorkerLike {
  return () => {
    const worker: WorkerLike = {
      onmessage: null,
      onerror: null,
      terminate: () => undefined,
      postMessage: (message: unknown) => {
        // SAFETY: the sandboxes post an object with an id; a test double reads it as such.
        const m = message as { id: number; action?: string };
        queueMicrotask(() => worker.onmessage?.({ data: { id: m.id, ...data(m) } }));
      },
    };
    return worker;
  };
}

describe("labStack", () => {
  it("lays the parts out in one track as wide as the lab, never wider", () => {
    expect(LAB_TRACK).toBe("minmax(0, 1fr)");
    expect(labStack(12)).toEqual({
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: 12,
      minWidth: 0,
    });
  });

  it("is what the check below looks for", () => {
    render(
      <div data-testid="root">
        <div style={{ display: "grid", gap: 4 }} />
        <div style={labStack(4)} />
      </div>,
    );
    expect(implicitGrids(screen.getByTestId("root"))).toHaveLength(1);
  });
});

describe("the labs stack their parts in a named track", () => {
  it("JwtLab, at every step", () => {
    const { container } = render(<JwtLab id="j" />);
    const steps = within(screen.getByRole("group", { name: "Étapes" })).getAllByRole("button");
    expect(steps).toHaveLength(5);
    for (const step of steps) {
      fireEvent.click(step);
      expect(implicitGrids(container), step.textContent).toEqual([]);
    }
  });

  it("GitSandbox, with a changed file listed", () => {
    const { container } = render(
      <GitSandbox
        id="g"
        setup={["git init", "echo 'a' > README.md", "git add .", 'git commit -m "README"']}
        checks={[{ label: "Branche fix", expect: "branch", branch: "fix" }]}
        hints={["git switch -c fix"]}
      />,
    );
    const input = screen.getByLabelText("Commande");
    fireEvent.change(input, { target: { value: "echo 'x' > notes.txt" } });
    fireEvent.submit(input.closest("form") ?? input);
    expect(screen.getByRole("list", { name: "Fichiers modifiés" })).toBeTruthy();
    expect(screen.queryByRole("note")).toBeNull();
    expect(implicitGrids(container)).toEqual([]);
  });

  it("PhpLab, with an answer on screen", async () => {
    const { container } = render(
      <PhpLab
        id="p"
        task="Attaquez."
        file="search.php"
        code={"<?php echo $_GET['q'];\n"}
        createWorker={answering(() => ({
          response: {
            status: 200,
            headers: ["X-Powered-By: PHP/8.4.1"],
            body: "<p>Résultats</p>",
            fatal: false,
          },
        }))}
      />,
    );
    fireEvent.change(screen.getByLabelText("Adresse de la requête"), {
      target: { value: "/search.php?q=php" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await screen.findByText("HTTP 200");
    expect(implicitGrids(container)).toEqual([]);
  });

  it("SqlPlayground, with a result on screen", async () => {
    const { container } = render(
      <SqlPlayground
        id="pg"
        schema="CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);"
        task="Liste les noms."
        createWorker={answering((m) =>
          m.action === "exec"
            ? { results: [{ columns: ["username"], values: [["alice"]] }] }
            : { results: [] },
        )}
      />,
    );
    fireEvent.change(screen.getByLabelText("Ta requête SQL"), {
      target: { value: "SELECT username FROM users" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Exécuter" }));
    await screen.findByText("1 ligne");
    expect(implicitGrids(container)).toEqual([]);
  });
});
