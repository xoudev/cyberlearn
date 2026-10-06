// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandExplanation } from "../command-explanation";

/**
 * The panel a terminal opens on a command: the line, what each command of
 * it does, then every word with its kind and its role, and a way to close.
 */

afterEach(cleanup);

describe("CommandExplanation", () => {
  it("explains a line word by word", () => {
    render(<CommandExplanation line="ls -la /etc | grep conf" />);
    const panel = screen.getByRole("region", { name: "Explication : ls -la /etc | grep conf" });
    expect(panel.textContent).toContain("ls : liste le contenu d'un dossier");
    expect(panel.textContent).toContain("grep : cherche un motif dans du texte");
    const items = within(screen.getByRole("list", { name: "Mot par mot" })).getAllByRole(
      "listitem",
    );
    expect(items.map((item) => item.querySelector("code")?.textContent)).toEqual([
      "ls",
      "-la",
      "/etc",
      "|",
      "grep",
      "conf",
    ]);
    expect(items[1]?.textContent).toContain("option");
    expect(items[1]?.textContent).toContain("-l : le format long");
    expect(items[1]?.textContent).toContain("-a : aussi les fichiers cachés");
    expect(items[3]?.textContent).toContain("opérateur");
    expect(items[3]?.textContent).toContain("tube");
    expect(items[5]?.textContent).toContain("argument");
    expect(screen.queryByRole("button", { name: "Fermer" })).toBeNull();
  });

  it("closes on request, and says when there is nothing to explain", () => {
    const onClose = vi.fn();
    render(<CommandExplanation line="   " onClose={onClose} />);
    expect(screen.getByText("Rien à expliquer : la ligne est vide.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
