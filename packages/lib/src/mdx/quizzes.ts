import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { attributeValue, type MdNode, type PlacedProblem, startOfNode } from "./attributes.js";
import { splitMdxSections } from "./split-sections.js";

/**
 * The quizzes of a lesson, read from its MDX without running any of it.
 *
 * A quiz answer is scored on the server: the page sends which option was
 * picked, and the answer key comes from here, not from the browser. The
 * lesson is parsed, never evaluated - attribute values are read off the
 * syntax tree - so scoring an answer cannot execute anything an author wrote.
 *
 * Exported on its own subpath (@cyberlearn/lib/mdx-quizzes): it pulls in the
 * MDX parser, and the mobile app imports @cyberlearn/lib.
 */

export interface LessonQuiz {
  /** The `id` attribute: unique within the lesson, the key an answer is stored under. */
  id: string;
  question: string;
  options: string[];
  /** Index of the right option. */
  correct: number;
  explanation: string | null;
}

/** A Quiz element as written, before anything is checked. */
export interface RawQuiz {
  id: unknown;
  question: unknown;
  options: unknown;
  correct: unknown;
  explanation: unknown;
  /** Where its `<Quiz` starts in the MDX read, both from 1. */
  line: number;
  column: number;
}

function stripFrontmatter(mdx: string): string {
  return mdx.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

const processor = createProcessor({ remarkPlugins: [remarkGfm] });

/** Every <Quiz> of a piece of MDX, in order, as written. Throws if it does not parse. */
export function readQuizElements(mdx: string): RawQuiz[] {
  const body = stripFrontmatter(mdx);
  // The lines the frontmatter took, so a quiz's line is the one in `mdx`.
  const skipped = mdx.slice(0, mdx.length - body.length).split("\n").length - 1;
  const tree = processor.parse(body) as unknown as MdNode;
  const found: RawQuiz[] = [];
  const visit = (node: unknown): void => {
    if (typeof node !== "object" || node === null) return;
    const n = node as MdNode;
    if ((n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") && n.name === "Quiz") {
      const attrs: Record<string, unknown> = {};
      for (const a of n.attributes ?? []) {
        const attr = a as { type?: string; name?: string };
        if (attr.type === "mdxJsxAttribute" && typeof attr.name === "string") {
          attrs[attr.name] = attributeValue(a);
        }
      }
      found.push({
        id: attrs.id,
        question: attrs.question,
        // "choices" is the legacy name the component still accepts.
        options: attrs.options ?? attrs.choices,
        correct: attrs.correct,
        explanation: attrs.explanation,
        line: (startOfNode(n)?.line ?? 1) + skipped,
        column: startOfNode(n)?.column ?? 1,
      });
    }
    for (const child of n.children ?? []) visit(child);
  };
  visit(tree);
  return found;
}

/**
 * The quizzes last read, by the exact text they were read from.
 *
 * Parsing a lesson is the dearest step of scoring an answer: 60 to 130 ms for
 * a lesson of 15 to 40 kB, measured locally, against a few milliseconds for
 * each database read around it. It used to be done again for every answer,
 * and for every page that reads a lesson's quizzes (the lesson page cuts it
 * into sections and reads each one). The result depends on the text alone,
 * so it is kept, keyed by that text: a lesson changed since is another text,
 * hence another key, and is read afresh. The answer key still comes from the
 * lesson as the server stores it now, never from anything a client sent.
 *
 * Least recently used first out, within a count and a total length: a lesson
 * and its sections take one entry each, and the longest lesson is 160 kB.
 */
const QUIZ_CACHE_MAX_ENTRIES = 256;
const QUIZ_CACHE_MAX_CHARS = 4_000_000;
const quizCache = new Map<string, readonly LessonQuiz[]>();
let quizCacheChars = 0;

function rememberQuizzes(mdx: string, quizzes: readonly LessonQuiz[]): void {
  // A text longer than the whole budget would only evict everything else.
  if (mdx.length > QUIZ_CACHE_MAX_CHARS) return;
  quizCache.set(mdx, quizzes);
  quizCacheChars += mdx.length;
  // A Map iterates in insertion order: its first key is the one used least recently.
  for (const oldest of quizCache.keys()) {
    if (quizCache.size <= QUIZ_CACHE_MAX_ENTRIES && quizCacheChars <= QUIZ_CACHE_MAX_CHARS) break;
    quizCache.delete(oldest);
    quizCacheChars -= oldest.length;
  }
}

/** What the cache holds, for its tests: entries, and the characters of their keys. */
export function quizCacheStats(): { entries: number; chars: number } {
  return { entries: quizCache.size, chars: quizCacheChars };
}

/** Empties the cache, for tests that time or count the parse. */
export function clearQuizCache(): void {
  quizCache.clear();
  quizCacheChars = 0;
}

/**
 * The well-formed quizzes of a lesson: what can be answered and scored.
 *
 * Read once per text (see quizCache above). Each call gets its own copies, so
 * a caller that changes what it was given changes nothing for the next one.
 */
export function extractLessonQuizzes(mdx: string): LessonQuiz[] {
  let quizzes = quizCache.get(mdx);
  if (quizzes === undefined) {
    const parsed = parseLessonQuizzes(mdx);
    // What does not parse has no quizzes, and is not kept: a draft being
    // written, or no text at all.
    if (parsed === null) return [];
    quizzes = parsed;
    rememberQuizzes(mdx, quizzes);
  } else {
    // Used again: to the back of the eviction order.
    quizCache.delete(mdx);
    quizCache.set(mdx, quizzes);
  }
  return quizzes.map((quiz) => ({ ...quiz, options: [...quiz.options] }));
}

/** The quizzes of a text, or null when it does not parse. */
function parseLessonQuizzes(mdx: string): LessonQuiz[] | null {
  let raw: RawQuiz[];
  try {
    raw = readQuizElements(mdx);
  } catch {
    return null;
  }
  const quizzes: LessonQuiz[] = [];
  const seen = new Set<string>();
  for (const q of raw) {
    if (typeof q.id !== "string" || q.id === "" || seen.has(q.id)) continue;
    if (!Array.isArray(q.options) || !q.options.every((o) => typeof o === "string")) continue;
    const options = q.options;
    if (typeof q.correct !== "number" || !Number.isInteger(q.correct)) continue;
    if (q.correct < 0 || q.correct >= options.length) continue;
    seen.add(q.id);
    quizzes.push({
      id: q.id,
      question: typeof q.question === "string" ? q.question : "",
      options,
      correct: q.correct,
      explanation:
        typeof q.explanation === "string" && q.explanation.trim() !== "" ? q.explanation : null,
    });
  }
  return quizzes;
}

/**
 * The section of a lesson each of its quizzes is in, from 0, as the lesson
 * page cuts it (splitMdxSections, one section a step), by quiz id. A section
 * that does not parse lists none. "Revoir ce passage" opens the lesson there.
 */
export function quizSections(mdx: string): Map<string, number> {
  const sections = new Map<string, number>();
  for (const [index, section] of splitMdxSections(mdx).entries()) {
    for (const quiz of extractLessonQuizzes(section)) {
      if (!sections.has(quiz.id)) sections.set(quiz.id, index);
    }
  }
  return sections;
}

/**
 * What makes a piece of MDX's quizzes unscorable, in French, or null.
 *
 * An answer is stored under the quiz's id, so a quiz without one cannot be
 * scored and two quizzes sharing one would share an answer. Pass the same
 * `seen` set for every section of a lesson: ids are unique per lesson.
 */
export function quizProblem(mdx: string, seen = new Set<string>()): string | null {
  return quizProblems(mdx, seen)[0]?.message ?? null;
}

/** Every unscorable quiz of a piece of MDX, each at its tag: what the editor marks. */
export function quizProblems(mdx: string, seen = new Set<string>()): PlacedProblem[] {
  let raw: RawQuiz[];
  try {
    raw = readQuizElements(mdx);
  } catch {
    // Not parsing is checkLessonMdx's to report, with the section.
    return [];
  }
  const problems: PlacedProblem[] = [];
  for (const q of raw) {
    const message = problemOf(q, seen);
    if (message !== null) problems.push({ message, line: q.line, column: q.column });
  }
  return problems;
}

function problemOf(q: RawQuiz, seen: Set<string>): string | null {
  const label =
    typeof q.question === "string" && q.question !== "" ? `« ${q.question} »` : "sans question";
  if (typeof q.id !== "string" || q.id.trim() === "") {
    return `Le quiz ${label} n'a pas d'identifiant : ajoute-lui un id="…" propre à cette leçon.`;
  }
  if (seen.has(q.id)) {
    return `Deux quiz portent l'identifiant « ${q.id} ». La réponse d'un élève est enregistrée sous cet identifiant : chaque quiz d'une leçon a le sien.`;
  }
  seen.add(q.id);
  const options = q.options;
  if (
    !Array.isArray(options) ||
    options.length < 2 ||
    !options.every((o) => typeof o === "string")
  ) {
    return `Le quiz « ${q.id} » doit avoir au moins deux options écrites en texte : options={["…", "…"]}.`;
  }
  if (
    typeof q.correct !== "number" ||
    !Number.isInteger(q.correct) ||
    q.correct < 0 ||
    q.correct >= options.length
  ) {
    return `Le quiz « ${q.id} » : correct doit être le numéro d'une de ses options, de 0 à ${String(options.length - 1)}.`;
  }
  return null;
}
