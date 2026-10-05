import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { BlockEditor } from "../components/block-editor/block-editor";

/**
 * The block editor on a small lesson: what it draws for each block, and the
 * MDX it writes after an edit, an insert, a move, a removal. The operations
 * themselves are block-editor-model.test.ts's business; this is the wiring,
 * from a field on screen to the lesson on disk.
 */

const LESSON = [
  "## un",
  "",
  "Un paragraphe.",
  "",
  '<Quiz id="q-1" question="Pourquoi ?" options={["a", "b"]} correct={1} />',
  "",
  '<FirewallLab id="pf-1" title="Un pare-feu" task="Ferme tout." probes={[{ "label": "x", "proto": "tcp", "from": "1.2.3.4", "port": 22, "expect": "block" }]} />',
  "",
].join("\n");

function setup(value = LESSON) {
  const onChange = vi.fn<(mdx: string) => void>();
  const view = render(<BlockEditor value={value} onChange={onChange} />);
  const last = (): string => onChange.mock.calls.at(-1)?.[0] ?? "";
  return { onChange, last, view };
}

describe("the block editor", () => {
  it("draws a card per block, forms for the components that have one, MDX for the others", () => {
    setup();
    const cards = screen.getAllByRole("region");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "Section",
      "Texte",
      "QCM",
      "Pare-feu",
    ]);
    expect(screen.getByLabelText("Texte du titre")).toHaveValue("un");
    expect(screen.getByLabelText("Question *")).toHaveValue("Pourquoi ?");
    expect(screen.getByLabelText("Option 2")).toHaveValue("b");
    expect(screen.getByLabelText("MDX du composant FirewallLab")).toHaveDisplayValue(
      /<FirewallLab/,
    );
  });

  it("writes the lesson again after a field changes, and nothing else changes", () => {
    const { last } = setup();
    fireEvent.change(screen.getByLabelText("Question *"), { target: { value: "Laquelle ?" } });
    expect(last()).toContain('question="Laquelle ?"');
    expect(last()).toContain("## un\n\nUn paragraphe.\n\n<Quiz");
    expect(last()).toContain("<FirewallLab");
  });

  it("flags a field the page would refuse, as the author types", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Question *"), { target: { value: "" } });
    const quiz = screen.getByRole("region", { name: "QCM" });
    expect(within(quiz).getByText("1 champ à revoir")).toBeInTheDocument();
    expect(within(quiz).getByRole("alert")).toHaveTextContent("Obligatoire.");
  });

  it("inserts a component from the menu with an id that does not collide", () => {
    const { last } = setup();
    const [firstPlus] = screen.getAllByRole("button", { name: "Ajouter un bloc ici" });
    if (!firstPlus) throw new Error("no insert point");
    fireEvent.click(firstPlus);
    fireEvent.click(screen.getByRole("menuitem", { name: "QCM" }));
    expect(last().startsWith('<Quiz\n  id="q-2"')).toBe(true);
    expect(last()).toContain('id="q-1"');
  });

  it("moves and removes blocks", () => {
    const { last } = setup();
    const text = screen.getByRole("region", { name: "Texte" });
    fireEvent.click(within(text).getByRole("button", { name: "Monter" }));
    expect(last().startsWith("Un paragraphe.\n\n## un")).toBe(true);
    const quiz = screen.getByRole("region", { name: "QCM" });
    fireEvent.click(within(quiz).getByRole("button", { name: "Retirer ce bloc" }));
    expect(last()).not.toContain("<Quiz");
  });

  it("takes a new lesson handed from outside, and keeps its own edits apart", () => {
    const { view, last } = setup();
    view.rerender(<BlockEditor value={"## autre\n\nTexte.\n"} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Texte du titre")).toHaveValue("autre");
    expect(last()).toBe("");
  });
});
