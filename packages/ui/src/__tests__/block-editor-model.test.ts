import type { ComponentBlock } from "@cyberlearn/lib/mdx-blocks";
import { describe, expect, it } from "vitest";
import {
  blocksFromSnippet,
  blocksOf,
  componentErrors,
  innerBlocks,
  insertAt,
  mdxOf,
  moveBy,
  newComponent,
  newHeading,
  removeAt,
  replaceAt,
  takenIds,
  updateComponent,
  updateComponentSource,
  updateHeading,
} from "../components/block-editor/model";

/**
 * The block editor's operations, over the MDX they write. What a lesson is
 * made of is the lib's business (blocks.test.ts); this is what the editor
 * does with it: the list, one block, new ones with ids that do not collide.
 */

const LESSON = [
  "## un",
  "",
  "Un paragraphe.",
  "",
  '<Quiz id="q-1" question="?" options={["a", "b"]} correct={0} />',
  "",
  "## deux",
  "",
  "Fin.",
  "",
].join("\n");

function list() {
  const blocks = blocksOf(LESSON);
  if (!blocks) throw new Error("does not parse");
  return blocks;
}

function component(blocks: ReturnType<typeof list>, index: number): ComponentBlock {
  const block = blocks[index]?.block;
  if (block?.kind !== "component") throw new Error("not a component");
  return block;
}

describe("the list", () => {
  it("writes the lesson back from its blocks", () => {
    expect(mdxOf(list())).toBe(LESSON);
  });

  it("inserts, moves, removes and replaces, by position", () => {
    const blocks = list();
    const added = insertAt(blocks, 1, [newHeading(3, "Sous-titre")]);
    expect(added.map((b) => b.block.source)[1]).toBe("### Sous-titre");
    expect(added).toHaveLength(blocks.length + 1);

    const moved = moveBy(blocks, 2, -1);
    expect(moved.map((b) => b.block.kind)).toEqual([
      "heading",
      "component",
      "text",
      "heading",
      "text",
    ]);
    expect(moveBy(blocks, 0, -1)).toEqual(blocks);
    expect(moveBy(blocks, 4, 1)).toEqual(blocks);

    expect(removeAt(blocks, 2).map((b) => b.block.kind)).toEqual([
      "heading",
      "text",
      "heading",
      "text",
    ]);

    const replaced = replaceAt(blocks, 0, newHeading(2, "autre"));
    expect(replaced[0]?.key).toBe(blocks[0]?.key);
    expect(replaced[0]?.block.source).toBe("## autre");
  });

  it("gives every block a key of its own, kept across edits", () => {
    const blocks = list();
    const keys = blocks.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(moveBy(blocks, 1, 1).map((b) => b.key)).toEqual([
      keys[0],
      keys[2],
      keys[1],
      keys[3],
      keys[4],
    ]);
  });
});

describe("one block", () => {
  it("rewrites a heading from its depth and text", () => {
    const heading = updateHeading(newHeading(2, "un"), { depth: 3, text: "trois" });
    expect(heading).toEqual({ kind: "heading", depth: 3, text: "trois", source: "### trois" });
  });

  it("rewrites a component from its fields, in the form's order, dropping empty ones", () => {
    const quiz = component(list(), 2);
    const next = updateComponent(
      quiz,
      { explanation: "", correct: 1, options: ["a", "b", "c"], question: "Laquelle ?", id: "q-1" },
      null,
    );
    expect(next.source).toBe(
      '<Quiz\n  id="q-1"\n  question="Laquelle ?"\n  options={["a","b","c"]}\n  correct={1}\n/>',
    );
    expect(next.attrs).toEqual({
      id: "q-1",
      question: "Laquelle ?",
      options: ["a", "b", "c"],
      correct: 1,
    });
  });

  it("keeps an attribute the form does not know, after the ones it does", () => {
    const quiz = component(list(), 2);
    const next = updateComponent(quiz, { ...quiz.attrs, questionCount: 3 }, null);
    expect(next.source.endsWith("  correct={0}\n  questionCount={3}\n/>")).toBe(true);
  });

  it("reads a component edited as text back into fields when it parses, and keeps the text otherwise", () => {
    const quiz = component(list(), 2);
    const parsed = updateComponentSource(
      quiz,
      '<Quiz id="q-9" question="?" options={["x", "y"]} correct={1} />',
    );
    expect(parsed.attrs).toMatchObject({ id: "q-9", correct: 1 });
    const broken = updateComponentSource(quiz, '<Quiz id="q-9" correct={1 +');
    expect(broken.source).toBe('<Quiz id="q-9" correct={1 +');
    expect(broken.attrs).toEqual(quiz.attrs);
  });

  it("validates a component through its form, and has nothing to say without one", () => {
    const quiz = component(list(), 2);
    expect(componentErrors(quiz)).toEqual({});
    expect(componentErrors(updateComponent(quiz, { ...quiz.attrs, question: "" }, null))).toEqual({
      question: "Obligatoire.",
    });
    const lab = blocksFromSnippet('<FirewallLab id="f" />', new Set())[0];
    if (lab?.kind !== "component") throw new Error("not a component");
    expect(componentErrors(lab)).toBeNull();
  });
});

describe("new blocks", () => {
  it("come from the guide's first example, with ids renamed past the ones in use", () => {
    const blocks = list();
    const taken = takenIds(blocks);
    expect(taken).toEqual(new Set(["q-1"]));
    const [quiz] = newComponent("Quiz", taken) ?? [];
    expect(quiz?.kind).toBe("component");
    if (quiz?.kind === "component") expect(quiz.attrs.id).toBe("q-2");
    expect(newComponent("Frobnicator", taken)).toBeNull();
  });

  it("renames the ids nested in a group too, and counts them as taken", () => {
    const [group] = newComponent("QuizGroup", new Set(["q-serie-1"])) ?? [];
    if (group?.kind !== "component") throw new Error("not a component");
    const nested = innerBlocks(group).map((item) =>
      item.block.kind === "component" ? item.block.attrs.id : null,
    );
    expect(nested).toEqual(["q-serie-2", "q-serie-3"]);
    expect(takenIds([{ key: "k", block: group }])).toEqual(new Set(["q-serie-2", "q-serie-3"]));
    expect(group.source).toContain('id="q-serie-3"');
  });

  it("turns a snippet that does not parse into a text block rather than losing it", () => {
    expect(blocksFromSnippet("<Callout>\n\nouvert", new Set())).toEqual([
      { kind: "text", source: "<Callout>\n\nouvert" },
    ]);
  });
});
