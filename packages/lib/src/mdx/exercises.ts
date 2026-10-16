import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { type ExerciseKind, terminalExerciseKey } from "../exercises/keys.js";
import { attributeValue, type MdNode } from "./attributes.js";

/**
 * The exercises of a lesson that pay a little XP once done (a LinuxTerminal,
 * a PythonChallenge, a component that renders one), read from its MDX
 * without running any of it.
 *
 * The browser is the judge of whether an exercise is done, but not of which
 * exercises exist: the server used to pay for any identifier it was sent, so
 * replaying the action with made-up ones paid without end. It now pays only
 * for a key this returns.
 *
 * Exported on its own subpath (@cyberlearn/lib/mdx-exercises): it pulls in
 * the MDX parser, and the mobile app imports @cyberlearn/lib.
 */

export interface LessonExercise {
  kind: ExerciseKind;
  /** What the page records it under (see exercises/keys.ts), trimmed as the action trims it. */
  key: string;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * The components a recordable exercise is written as, and the key each is
 * recorded under, from its attributes. A component that renders an exercise
 * itself belongs here too, keyed as it hands the key down: otherwise its
 * exercise is one the lesson does not have, and finishing it pays nothing.
 */
const RECORDABLE: Readonly<
  Record<
    string,
    { kind: ExerciseKind; key: (attrs: Record<string, unknown>) => string | undefined }
  >
> = {
  LinuxTerminal: { kind: "TERMINAL", key: (a) => terminalExerciseKey(text(a.id), text(a.title)) },
  PythonChallenge: { kind: "PYTHON", key: (a) => text(a.id) },
  // Two machines on one cable: the target's LinuxTerminal is the exercise,
  // given the lab's id. The attacker's has nothing to check, and records nothing.
  TwoMachineLab: { kind: "TERMINAL", key: (a) => text(a.id) },
};

function stripFrontmatter(mdx: string): string {
  return mdx.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

const processor = createProcessor({ remarkPlugins: [remarkGfm] });

/** Every recordable exercise of a lesson, nested ones included. Empty if it does not parse. */
export function extractLessonExercises(mdx: string): LessonExercise[] {
  let tree: MdNode;
  try {
    tree = processor.parse(stripFrontmatter(mdx));
  } catch {
    return [];
  }
  const found: LessonExercise[] = [];
  const visit = (node: unknown): void => {
    if (typeof node !== "object" || node === null) return;
    // SAFETY: an mdast node of the tree processor.parse returned, or one of
    // its children: an object with a type, and a name, attributes and
    // children when it is an MDX element.
    const n = node as MdNode;
    const recordable =
      (n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") &&
      typeof n.name === "string"
        ? RECORDABLE[n.name]
        : undefined;
    if (recordable !== undefined) {
      const attrs: Record<string, unknown> = {};
      for (const a of n.attributes ?? []) {
        // SAFETY: an element's attribute, an mdxJsxAttribute (a name and a
        // value) or an mdxJsxExpressionAttribute (a spread, without a name).
        const attr = a as { type?: string; name?: string };
        if (attr.type === "mdxJsxAttribute" && typeof attr.name === "string") {
          attrs[attr.name] = attributeValue(a);
        }
      }
      const key = recordable.key(attrs);
      if (key !== undefined && key.trim() !== "") {
        found.push({ kind: recordable.kind, key: key.trim() });
      }
    }
    for (const child of n.children ?? []) visit(child);
  };
  visit(tree);
  return found;
}

/** Whether the lesson has an exercise of this kind recorded under this key. */
export function lessonHasExercise(mdx: string, kind: ExerciseKind, key: string): boolean {
  return extractLessonExercises(mdx).some((e) => e.kind === kind && e.key === key);
}
