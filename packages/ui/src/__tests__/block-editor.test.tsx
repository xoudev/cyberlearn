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
  it("draws a card per block, a form for every component, MDX for a stranger", () => {
    setup(`${LESSON}<Frobnicator id="x" />\n`);
    const cards = screen.getAllByRole("region");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "Section",
      "Texte",
      "QCM",
      "Pare-feu",
      "Composant",
    ]);
    expect(screen.getByLabelText("Texte du titre")).toHaveValue("un");
    expect(screen.getByLabelText("Question *")).toHaveValue("Pourquoi ?");
    expect(screen.getByLabelText("Option 2")).toHaveValue("b");
    expect(screen.getByLabelText("Consigne *")).toHaveValue("Ferme tout.");
    expect(screen.getByLabelText("MDX du composant Frobnicator")).toHaveDisplayValue(
      /<Frobnicator/,
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

describe("the exercise forms", () => {
  const EXERCISES = [
    '<FindTheFlaw id="f-1" code={`a\nb`} line={2} options={["x", "y"]} correct={0} explanation="Parce que." />',
    '<PhotoOsint id="o-1" src="/osint/x.jpg" alt="a" task="t" answer={{ "latitude": 45.7, "longitude": 4.8 }} place="Lyon" />',
    '<NetworkLab id="n-1" task="t" devices={[{ "id": "pc1", "kind": "pc", "name": "PC1", "x": 1, "y": 1 }]} />',
    '<HexEditor id="h-1" task="t" bytes="89 50" questions={[{ "label": "?", "answer": ["1x1", "1 x 1"] }]} />',
    "",
  ].join("\n\n");

  it("draw a form for every exercise, groups and JSON included", () => {
    setup(EXERCISES);
    expect(screen.getByLabelText("Ligne fautive *")).toHaveValue(2);
    expect(screen.getByLabelText("Latitude *")).toHaveValue(45.7);
    expect(screen.getByLabelText("Appareils *")).toHaveDisplayValue(/"name": "PC1"/);
    expect(screen.getByLabelText("Questions 1 : Réponse")).toHaveValue("1x1 | 1 x 1");
    expect(screen.queryByLabelText(/MDX du composant/)).toBeNull();
  });

  it("write a group's sub-field and a JSON field back into the lesson", () => {
    const { last } = setup(EXERCISES);
    fireEvent.change(screen.getByLabelText("Latitude *"), { target: { value: "48.85" } });
    expect(last()).toContain('answer={{"latitude":48.85,"longitude":4.8}}');
    fireEvent.change(screen.getByLabelText("Appareils *"), {
      target: { value: '[{"id":"pc2","kind":"pc","name":"PC2","x":2,"y":2}]' },
    });
    expect(last()).toContain('"name":"PC2"');
  });

  it("keep the last structure while the JSON being typed is not one yet", () => {
    const { last } = setup(EXERCISES);
    fireEvent.change(screen.getByLabelText("Appareils *"), { target: { value: "[{" } });
    expect(screen.getByText(/JSON incomplet/)).toBeInTheDocument();
    expect(last()).toBe("");
  });

  it("show the parser's verdict on the block when the fields are fine but the page would refuse", () => {
    setup(
      '<PacketDissector id="p-1" frame={{ "eth": { "src": "08:00:27:4e:66:a1", "dst": "00:0c:29:1a:2b:3c" } }} />\n',
    );
    const card = screen.getByRole("region", { name: "Décortiquer un paquet" });
    expect(within(card).getByRole("alert")).toHaveTextContent("arp ou ip");
  });
});
