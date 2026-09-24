import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

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
}

interface EsNode {
  type: string;
  [key: string]: unknown;
}

interface MdNode {
  type: string;
  name?: string | null;
  attributes?: unknown[];
  children?: unknown[];
}

const NOT_A_VALUE = Symbol("not a value");

/** The value an expression spells out, or NOT_A_VALUE when it computes one. */
function valueOf(node: EsNode): unknown {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "TemplateLiteral": {
      if ((node.expressions as unknown[]).length > 0) return NOT_A_VALUE;
      const [quasi] = node.quasis as { value: { cooked: string | null } }[];
      return quasi?.value.cooked ?? NOT_A_VALUE;
    }
    case "ArrayExpression": {
      const items = (node.elements as (EsNode | null)[]).map((e) =>
        e === null || e.type === "SpreadElement" ? NOT_A_VALUE : valueOf(e),
      );
      return items.includes(NOT_A_VALUE) ? NOT_A_VALUE : items;
    }
    case "ObjectExpression": {
      const out: Record<string, unknown> = {};
      for (const p of node.properties as EsNode[]) {
        if (p.type !== "Property" || p.computed === true || p.kind !== "init") return NOT_A_VALUE;
        const key = p.key as EsNode;
        const name = key.type === "Identifier" ? key.name : key.value;
        const value = valueOf(p.value as EsNode);
        if (value === NOT_A_VALUE) return NOT_A_VALUE;
        out[String(name)] = value;
      }
      return out;
    }
    case "UnaryExpression": {
      const argument = node.argument as EsNode;
      if (argument.type !== "Literal" || typeof argument.value !== "number") return NOT_A_VALUE;
      if (node.operator === "-") return -argument.value;
      if (node.operator === "+") return argument.value;
      return NOT_A_VALUE;
    }
    default:
      return NOT_A_VALUE;
  }
}

function attributeValue(attribute: unknown): unknown {
  // SAFETY: an mdxJsxAttribute: a name and a value that is a string, null (a
  // bare attribute), or an expression carrying its ESTree.
  const { value } = attribute as { value: unknown };
  if (value === null) return true;
  if (typeof value === "string") return value;
  const program = (value as { data?: { estree?: { body?: EsNode[] } } }).data?.estree;
  const statement = program?.body?.[0];
  if (program?.body?.length !== 1 || statement?.type !== "ExpressionStatement") return undefined;
  const result = valueOf(statement.expression as EsNode);
  return result === NOT_A_VALUE ? undefined : result;
}

function stripFrontmatter(mdx: string): string {
  return mdx.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

const processor = createProcessor({ remarkPlugins: [remarkGfm] });

/** Every <Quiz> of a piece of MDX, in order, as written. Throws if it does not parse. */
export function readQuizElements(mdx: string): RawQuiz[] {
  const tree = processor.parse(stripFrontmatter(mdx)) as unknown as MdNode;
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
      });
    }
    for (const child of n.children ?? []) visit(child);
  };
  visit(tree);
  return found;
}

/** The well-formed quizzes of a lesson: what can be answered and scored. */
export function extractLessonQuizzes(mdx: string): LessonQuiz[] {
  let raw: RawQuiz[];
  try {
    raw = readQuizElements(mdx);
  } catch {
    return [];
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
 * What makes a piece of MDX's quizzes unscorable, in French, or null.
 *
 * An answer is stored under the quiz's id, so a quiz without one cannot be
 * scored and two quizzes sharing one would share an answer. Pass the same
 * `seen` set for every section of a lesson: ids are unique per lesson.
 */
export function quizProblem(mdx: string, seen = new Set<string>()): string | null {
  let raw: RawQuiz[];
  try {
    raw = readQuizElements(mdx);
  } catch {
    // Not parsing is checkLessonMdx's to report, with the section.
    return null;
  }
  for (const q of raw) {
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
  }
  return null;
}
