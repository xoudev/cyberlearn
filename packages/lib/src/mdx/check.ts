import { evaluate } from "@mdx-js/mdx";
import { quizProblem } from "./quizzes.js";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { parseChallengeTests } from "@cyberlearn/types";
import { LessonMdxValueError, remarkLiteralValuesOnly } from "./literal-values.js";
import { splitMdxSections } from "./split-sections.js";

/**
 * Whether a lesson's MDX will actually render - asked before it is saved.
 *
 * On 22 September a lesson was edited twice in a few minutes and each save
 * broke /lessons/python-projet-cli for everybody who opened it: first a
 * Python `True` inside a component's props (Sentry JAVASCRIPT-NEXTJS-14),
 * then a dictionary where the challenge wanted text (JAVASCRIPT-NEXTJS-15).
 * The editor accepted both, because nothing between the textarea and the
 * database ever ran the content. The import had a dry-run compile, which is
 * not the same thing: `True` compiles perfectly well. It is JavaScript that
 * only fails when it runs.
 *
 * So this runs it. Each section is compiled and its content function called,
 * which builds every value the author wrote - exactly what the lesson page
 * does, section by section, with the same remark plugins. Then the element
 * tree is walked for challenges, whose tests are read the same way the
 * component reads them. Whatever this accepts, the page renders.
 *
 * Running it is safe because of remarkLiteralValuesOnly, which is in those
 * plugins: between braces an author writes values, never code, and anything
 * else is refused before it is compiled. The first version of this check had
 * no such guard and evaluated whatever the braces held, on the server.
 *
 * Exported on its own subpath, not from the package index: it pulls in the MDX
 * compiler, and the mobile app imports @cyberlearn/lib.
 */

// ── The remark pipeline, shared with the lesson page ─────────────────────────

/**
 * Removes expressions written in prose - `{variable}` in a paragraph - and
 * leaves attribute expressions alone.
 *
 * The page renders with next-mdx-remote's blockJS off, because blockJS strips
 * attribute expressions too and every Quiz and CodePlayground needs them. This
 * gives back the half of that protection that costs nothing: a stray brace in
 * a sentence is dropped rather than run.
 */
export function remarkStripProseExpressions() {
  return (tree: unknown): void => {
    // SAFETY: a unist Root; only .type and .children are read.
    stripNode(tree as { type?: string; children?: unknown[] });
  };
}

function stripNode(node: { type?: string; children?: unknown[] }): void {
  if (!node.children) return;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];
    if (typeof child !== "object" || child === null) continue;
    const c = child as { type?: string; children?: unknown[] };
    if (c.type === "mdxFlowExpression" || c.type === "mdxTextExpression") {
      node.children.splice(i, 1);
    } else {
      stripNode(c);
    }
  }
}

/**
 * The remark plugins a lesson is rendered with. One list, imported by the page
 * and used here, so that what is checked and what is shown cannot drift apart.
 */
export const LESSON_REMARK_PLUGINS = [
  remarkGfm,
  remarkStripProseExpressions,
  remarkLiteralValuesOnly,
];

/** Every component a lesson may use, by the name it is written with. */
export const LESSON_COMPONENT_NAMES = [
  "Quiz",
  "QuizGroup",
  "CodePlayground",
  "SimulatedTerminal",
  "LessonVideo",
  "LessonImage",
  "ExternalLink",
  "Callout",
  "Diagram",
  "PythonChallenge",
] as const;

// ── The check ────────────────────────────────────────────────────────────────

export type LessonMdxCheck =
  | { ok: true }
  | {
      ok: false;
      /** The section's heading, or "introduction" for the text before the first. */
      section: string;
      /** In French, for the person who wrote it. */
      message: string;
      /** "quiz" when the lesson renders but a quiz could not be scored. */
      kind?: "quiz";
    };

/** Stands in for every component: rendering is not the question, props are. */
function Stub(): null {
  return null;
}
const STUBS: Record<string, () => null> = Object.fromEntries(
  LESSON_COMPONENT_NAMES.map((name) => [name, Stub]),
);
// Its own function, so the tree walk can tell a challenge from the rest.
function ChallengeStub(): null {
  return null;
}
STUBS.PythonChallenge = ChallengeStub;

type MdxContent = (props: { components: Record<string, unknown> }) => ReactNode;

export async function checkLessonMdx(mdx: string): Promise<LessonMdxCheck> {
  const sections = splitMdxSections(mdx);
  for (const source of sections) {
    const problem = await problemIn(source);
    if (problem === null) continue;

    // splitMdxSections glues whatever precedes the first heading onto the
    // first section, because that is how the page lays it out. Reporting the
    // heading then sends the author to the wrong paragraph, so a failing
    // section with text above its heading has that text checked on its own.
    const lead = leadOf(source);
    const leadProblem = lead === null ? null : await problemIn(lead);
    return leadProblem !== null
      ? { ok: false, section: "introduction", message: leadProblem }
      : { ok: false, section: headingOf(source), message: problem };
  }

  // Every section renders. Then the quizzes: each answer is stored under its
  // quiz's id, so the ids must exist and be unique across the lesson.
  const seenQuizIds = new Set<string>();
  for (const source of sections) {
    const problem = quizProblem(source, seenQuizIds);
    if (problem !== null) {
      return { ok: false, section: headingOf(source), message: problem, kind: "quiz" };
    }
  }
  return { ok: true };
}

/** What is wrong with one piece of MDX, or null when it renders. */
async function problemIn(source: string): Promise<string | null> {
  try {
    const { default: Content } = await evaluate(source, {
      ...runtime,
      remarkPlugins: LESSON_REMARK_PLUGINS,
      development: false,
    });
    // SAFETY: evaluate returns the compiled module; its default export is the
    // content function. Calling it evaluates every expression now.
    const tree = (Content as unknown as MdxContent)({ components: STUBS });
    return firstChallengeProblem(tree);
  } catch (error) {
    return explain(error);
  }
}

/**
 * The section's heading. A line scan, not a regex: `^##\s+(.+)$` lets `\s+`
 * and `.+` compete for the same whitespace, and the source is whatever an
 * author typed - a heading followed by a few thousand tabs made it backtrack
 * polynomially (CodeQL js/polynomial-redos). `## ` with a literal space is
 * also exactly what splitMdxSections splits on.
 */
function headingOf(source: string): string {
  for (const line of source.split("\n")) {
    if (line.startsWith("## ")) return line.slice(3).trim() || "introduction";
  }
  return "introduction";
}

/** The text before a section's heading, when there is any. */
function leadOf(source: string): string | null {
  const at = source.search(/^## /m);
  // -1: no heading at all. 0: the heading is the first thing, nothing leads.
  if (at <= 0) return null;
  const lead = source.slice(0, at);
  return lead.trim() === "" ? null : lead;
}

/** The first misconfigured challenge in an element tree, or null. */
function firstChallengeProblem(node: ReactNode): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstChallengeProblem(child as ReactNode);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;

  // SAFETY: a React element's props are an object; only these two are read.
  const props = node.props as { tests?: unknown; children?: ReactNode };
  if (node.type === ChallengeStub) {
    const parsed = parseChallengeTests(props.tests);
    if (!parsed.ok) return `Défi Python : ${parsed.problem}`;
  }
  return props.children === undefined ? null : firstChallengeProblem(props.children);
}

/**
 * The error in the author's terms. A refused value already says what to write
 * instead (see remarkLiteralValuesOnly); anything else is the compiler's own
 * first line - a tag left open, a quote that never closes.
 */
function explain(error: unknown): string {
  if (error instanceof LessonMdxValueError) return error.message;
  const raw = error instanceof Error ? error.message : String(error);
  return raw.split("\n")[0] ?? raw;
}

/**
 * The refusal as one sentence, for a form's error slot.
 *
 * Written once so the four editors and the import say it the same way.
 */
export function describeLessonMdxProblem(check: Extract<LessonMdxCheck, { ok: false }>): string {
  const where =
    check.section === "introduction" ? "L'introduction" : `La section « ${check.section} »`;
  if (check.kind === "quiz") return `${where} : ${check.message} Rien n'a été enregistré.`;
  return `${where} ne s'afficherait pas, donc rien n'a été enregistré. ${check.message}`;
}
