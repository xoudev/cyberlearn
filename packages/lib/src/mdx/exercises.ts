import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { type ExerciseKind, terminalExerciseKey } from "../exercises/keys.js";
import { attributeValue, type MdNode } from "./attributes.js";

/**
 * The exercises of a lesson that pay a little XP once done (a LinuxTerminal,
 * a PythonChallenge), read from its MDX without running any of it.
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

const KIND_OF: Readonly<Record<string, ExerciseKind>> = {
  LinuxTerminal: "TERMINAL",
  PythonChallenge: "PYTHON",
};

function stripFrontmatter(mdx: string): string {
  return mdx.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

const processor = createProcessor({ remarkPlugins: [remarkGfm] });

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

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
    const n = node as MdNode;
    const kind =
      (n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") &&
      typeof n.name === "string"
        ? KIND_OF[n.name]
        : undefined;
    if (kind !== undefined) {
      const attrs: Record<string, unknown> = {};
      for (const a of n.attributes ?? []) {
        const attr = a as { type?: string; name?: string };
        if (attr.type === "mdxJsxAttribute" && typeof attr.name === "string") {
          attrs[attr.name] = attributeValue(a);
        }
      }
      const key =
        kind === "TERMINAL"
          ? terminalExerciseKey(text(attrs.id), text(attrs.title))
          : text(attrs.id);
      if (key !== undefined && key.trim() !== "") found.push({ kind, key: key.trim() });
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
