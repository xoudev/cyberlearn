import { createProcessor, evaluate } from "@mdx-js/mdx";
import { escapeProblems } from "./escapes.js";
import { quizProblems } from "./quizzes.js";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import {
  parseChallengeTests,
  parseCryptoWorkshop,
  parseFindTheFlaw,
  parseFirewallLab,
  parseGitSandbox,
  parseHexEditor,
  parseIncidentStory,
  parseJwtLab,
  parseLogHunt,
  parseMatchPairs,
  parseNetworkLab,
  parsePacketDissector,
  parsePasswordLab,
  parsePhpLab,
  parsePhishingEmail,
  parsePhotoOsint,
  parsePutInOrder,
  parseStepAnimation,
  parseSqlInjectionLab,
  parseSqlPlayground,
  parseSubnetDrill,
} from "@cyberlearn/types";
import { crackableUsers } from "../crypto/cracking";
import { runSetup } from "../git/sandbox";
import { parseRules } from "../network/firewall";
import { buildFrame, missingFields } from "../network/packet";
import { buildNetwork } from "../network/topology";
import { type MdNode, type MdxPlace, type PlacedProblem, startOfNode } from "./attributes.js";
import { protectPropIndentation } from "./indentation.js";
import { LessonMdxValueError, remarkLiteralValuesOnly } from "./literal-values.js";
import { type MdxSection, splitMdxSectionsAt } from "./split-sections.js";

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
 * Every problem comes with its line and column in the whole lesson, numbered
 * from 1 as the editor numbers them, and every problem is reported: one per
 * section that does not compile, one per misconfigured exercise, quiz or
 * string. The editor marks each at its place, and the author fixes them in one
 * pass instead of saving once per mistake.
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
export { protectPropIndentation };

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
// The names live in names.ts, which the editor reads in the browser; they are
// re-exported here because this is where everything else reads them.
export { LESSON_COMPONENT_NAMES, type LessonComponentName } from "./names.js";
import { LESSON_COMPONENT_NAMES, type LessonComponentName } from "./names.js";

// ── The check ────────────────────────────────────────────────────────────────

/** One thing wrong with a lesson, and where. */
export interface LessonMdxProblem {
  /** The section's heading, or "introduction" for the text before the first. */
  section: string;
  /** In French, for the person who wrote it. */
  message: string;
  /**
   * "quiz" when the lesson renders but a quiz could not be scored, "text"
   * when it renders but shows a string other than the one written,
   * "authoring" when it renders but breaks a rule of the catalogue
   * (authoring.ts). Absent: the section does not render.
   */
  kind?: "quiz" | "text" | "authoring";
  /** In the whole lesson, from 1: the line the editor shows. */
  line: number;
  /** From 1. */
  column: number;
}

export type LessonMdxCheck =
  | { ok: true }
  | (LessonMdxProblem & {
      ok: false;
      /**
       * Every problem, the gravest first (a section that does not render,
       * then the rest), then in the order of the lesson. The fields above
       * repeat the first. Capped at MAX_LESSON_MDX_PROBLEMS.
       */
      problems: LessonMdxProblem[];
      /** How many problems there are, those past the cap included. */
      total: number;
    });

/**
 * How many problems a result carries. A lesson pasted with a dash on every
 * line would otherwise answer with thousands of them, for an author who
 * needs the first few to see the pattern.
 */
export const MAX_LESSON_MDX_PROBLEMS = 50;

/** Stands in for every component: rendering is not the question, props are. */
const STUBS: Record<string, () => null> = {};
/** Each stub is its own function, so the tree walk can tell components apart. */
const STUB_NAMES = new Map<unknown, LessonComponentName>();
for (const name of LESSON_COMPONENT_NAMES) {
  const stub = (): null => null;
  STUBS[name] = stub;
  STUB_NAMES.set(stub, name);
}

type MdxContent = (props: { components: Record<string, unknown> }) => ReactNode;

export async function checkLessonMdx(mdx: string): Promise<LessonMdxCheck> {
  return lessonMdxResult(await lessonMdxProblems(mdx));
}

/** The problems, gathered into a result: what checkLessonMdx answers. */
export function lessonMdxResult(problems: readonly LessonMdxProblem[]): LessonMdxCheck {
  const sorted = [...problems].sort(
    (a, b) => weight(a) - weight(b) || a.line - b.line || a.column - b.column,
  );
  const [first] = sorted;
  if (first === undefined) return { ok: true };
  return {
    ok: false,
    ...first,
    problems: sorted.slice(0, MAX_LESSON_MDX_PROBLEMS),
    total: sorted.length,
  };
}

/** A section that does not render comes before the rest. */
function weight(problem: LessonMdxProblem): number {
  if (problem.kind === undefined) return 0;
  return problem.kind === "authoring" ? 2 : 1;
}

/** Every problem of a lesson, in no particular order. */
export async function lessonMdxProblems(mdx: string): Promise<LessonMdxProblem[]> {
  const problems: LessonMdxProblem[] = [];
  const compiled: MdxSection[] = [];
  const sections = splitMdxSectionsAt(mdx);
  const nameAt = sectionNamer(sections);
  for (const section of sections) {
    const result = await renderProblems(section, nameAt);
    problems.push(...result.problems);
    if (result.compiled) compiled.push(section);
  }

  // Then the quizzes: each answer is stored under its quiz's id, so the ids
  // must exist and be unique across the lesson. And the text between braces:
  // a backslash JavaScript drops would render without a word of warning (see
  // escapes.ts). Asked of the sections that compile: in one that does not,
  // the quiz with the refused value would be reported twice.
  const seenQuizIds = new Set<string>();
  for (const section of compiled) {
    for (const found of quizProblems(section.source, seenQuizIds)) {
      problems.push(placed(section, found, nameAt, "quiz"));
    }
    for (const found of escapeProblems(section.source)) {
      problems.push(placed(section, found, nameAt, "text"));
    }
  }
  return problems;
}

/** The name of the part of the lesson a line of the whole lesson is in. */
export type LessonSectionNamer = (line: number) => string;

/**
 * A problem found in a section, moved to its place in the lesson and given
 * the name of the part it is in, or the name it is told.
 */
function placed(
  section: MdxSection,
  found: PlacedProblem,
  name: string | LessonSectionNamer,
  kind?: LessonMdxProblem["kind"],
): LessonMdxProblem {
  const line = section.line + found.line - 1;
  const problem: LessonMdxProblem = {
    section: typeof name === "string" ? name : name(line),
    message: found.message,
    line,
    column: found.column,
  };
  if (kind !== undefined) problem.kind = kind;
  return problem;
}

/**
 * The name of the part of a lesson each line is in, the lesson read once for
 * all of its problems: a lesson with thousands of them used to be split again
 * for each one, and froze the server for as long. splitMdxSections glues
 * whatever precedes the first heading onto the first section, because that is
 * how the page lays it out, and a fault above the heading is the
 * introduction's, as is a line above every section.
 */
function sectionNamer(sections: readonly MdxSection[]): LessonSectionNamer {
  const parts: { line: number; name: string }[] = [];
  for (const section of sections) {
    const heading = headingAt(section.source);
    if (heading === null || heading.index > 0) {
      parts.push({ line: section.line, name: "introduction" });
    }
    if (heading !== null) parts.push({ line: section.line + heading.index, name: heading.name });
  }
  return (line) => {
    // The last part starting at or above the line, by halves.
    let name = "introduction";
    let low = 0;
    let high = parts.length - 1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      const part = parts[middle];
      if (part === undefined) break;
      if (part.line <= line) {
        name = part.name;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return name;
  };
}

/** The names the problems give, for a lesson's other checks (authoring.ts). */
export function lessonSectionNamer(mdx: string): LessonSectionNamer {
  return sectionNamer(splitMdxSectionsAt(mdx));
}

/**
 * The props each `<name>` of a lesson is given, as the page compiles them: the
 * same sections, the same plugins, the same protection for indentation. For
 * the tests that play a lesson's exercises on their engines, which must read
 * what the lesson says rather than a copy of it, and for the diagram check
 * (authoring.ts). Nothing is rendered: the element tree is only read.
 */
export async function componentPropsOf(
  mdx: string,
  name: LessonComponentName,
): Promise<Record<string, unknown>[]> {
  const found: Record<string, unknown>[] = [];
  const capture = (): null => null;
  const collect = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      for (const child of node) collect(child as ReactNode);
      return;
    }
    if (!isValidElement(node)) return;
    // SAFETY: a React element's props are an object; children is read as a node.
    const props = node.props as Record<string, unknown> & { children?: ReactNode };
    if (node.type === capture) found.push(props);
    if (props.children !== undefined) collect(props.children);
  };
  for (const { source } of splitMdxSectionsAt(mdx)) {
    const { default: Content } = await evaluate(protectPropIndentation(source), {
      ...runtime,
      remarkPlugins: LESSON_REMARK_PLUGINS,
      development: false,
    });
    // SAFETY: as in evaluated, the default export is the content function.
    collect((Content as unknown as MdxContent)({ components: { ...STUBS, [name]: capture } }));
  }
  return found;
}

/**
 * What keeps a section from rendering, or its misconfigured exercises.
 *
 * Compiling stops at the first error, so a section that does not compile has
 * one problem; one that does has one per exercise that its component would
 * refuse.
 */
async function renderProblems(
  section: MdxSection,
  nameAt: LessonSectionNamer,
): Promise<{ compiled: boolean; problems: LessonMdxProblem[] }> {
  const result = await evaluated(section.source);
  if ("tree" in result) {
    const found = exerciseProblems(result.tree, componentPlaces(section.source));
    return { compiled: true, problems: found.map((problem) => placed(section, problem, nameAt)) };
  }

  // A failing section with text above its heading has that text compiled on
  // its own: the compiler often reports a tag left open at the end of what it
  // read, which would be the heading's section when the tag is the
  // introduction's.
  const lead = leadOf(section.source);
  const leadResult = lead === null ? null : await evaluated(lead);
  const problem =
    leadResult !== null && "error" in leadResult
      ? placed(section, leadResult.error, "introduction")
      : placed(section, result.error, headingOf(section.source));
  return { compiled: false, problems: [problem] };
}

/** A piece of MDX compiled and run as the page does: its tree, or what stops it. */
async function evaluated(source: string): Promise<{ tree: ReactNode } | { error: PlacedProblem }> {
  // The same source the page compiles: see indentation.ts.
  const compiled = protectPropIndentation(source);
  try {
    const { default: Content } = await evaluate(compiled, {
      ...runtime,
      remarkPlugins: LESSON_REMARK_PLUGINS,
      development: false,
    });
    // SAFETY: evaluate returns the compiled module; its default export is the
    // content function. Calling it evaluates every expression now.
    return { tree: (Content as unknown as MdxContent)({ components: STUBS }) };
  } catch (error) {
    const { message, place } = explain(error);
    const at =
      place === null
        ? (missingComponentPlace(message, source) ?? { line: 1, column: 1 })
        : asWritten(source, compiled, place);
    return { error: { message, ...at } };
  }
}

/**
 * Where a component the page does not know is first used: a typo in a tag
 * name. MDX throws when the content runs into it, with no place; the syntax
 * tree of the source as written has one.
 */
function missingComponentPlace(message: string, source: string): MdxPlace | null {
  const name = /^Expected component `([^`]+)` to be defined/.exec(message)?.[1];
  return name === undefined ? null : (componentPlaces(source).get(name)?.[0] ?? null);
}

/**
 * A place in the compiled source, moved back to the source as written.
 *
 * protectPropIndentation keeps every line where it is, and on a line it
 * changes, changes only the leading whitespace, written as escapes. A column
 * past them moves back by the length they added; a column inside them goes to
 * the end of the whitespace they stand for.
 */
function asWritten(source: string, compiled: string, place: MdxPlace): MdxPlace {
  const written = source.split("\n")[place.line - 1];
  const read = compiled.split("\n")[place.line - 1];
  if (written === undefined || read === undefined || written === read) return place;
  const writtenIndent = written.length - written.trimStart().length;
  const readIndent = read.length - (written.length - writtenIndent);
  if (place.column - 1 < readIndent) {
    return { line: place.line, column: Math.min(place.column, writtenIndent + 1) };
  }
  return { line: place.line, column: place.column - (readIndent - writtenIndent) };
}

/**
 * The section's heading. A line scan, not a regex: `^##\s+(.+)$` lets `\s+`
 * and `.+` compete for the same whitespace, and the source is whatever an
 * author typed - a heading followed by a few thousand tabs made it backtrack
 * polynomially (CodeQL js/polynomial-redos). `## ` with a literal space is
 * also exactly what splitMdxSections splits on.
 */
function headingOf(source: string): string {
  return headingAt(source)?.name ?? "introduction";
}

/** The section's heading, and the line it is on, counted from 0 in the section. */
function headingAt(source: string): { index: number; name: string } | null {
  let index = 0;
  for (const line of source.split("\n")) {
    if (line.startsWith("## ")) return { index, name: line.slice(3).trim() || "introduction" };
    index++;
  }
  return null;
}

/** The text before a section's heading, when there is any. */
function leadOf(source: string): string | null {
  const at = source.search(/^## /m);
  // -1: no heading at all. 0: the heading is the first thing, nothing leads.
  if (at <= 0) return null;
  const lead = source.slice(0, at);
  return lead.trim() === "" ? null : lead;
}

const parser = createProcessor({ remarkPlugins: [remarkGfm] });

/**
 * Where each component's tags start, by name, in the order the page builds
 * them. The element tree has no positions; the syntax tree of the same source
 * does, and both list a component's elements in the same order: the k-th
 * PhpLab of one is the k-th of the other.
 */
function componentPlaces(source: string): Map<string, MdxPlace[]> {
  const places = new Map<string, MdxPlace[]>();
  const visit = (node: MdNode): void => {
    if (
      (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
      typeof node.name === "string"
    ) {
      const list = places.get(node.name) ?? [];
      list.push(startOfNode(node) ?? { line: 1, column: 1 });
      places.set(node.name, list);
    }
    // SAFETY: every child of an mdast node is an mdast node.
    for (const child of node.children ?? []) visit(child as MdNode);
  };
  try {
    // An mdast Root, of which MdNode is the subset read here.
    visit(parser.parse(source));
  } catch {
    // It compiled a moment ago; should the parse still fail, the problems
    // found go to the section's first line rather than nowhere.
  }
  return places;
}

/**
 * Every misconfigured exercise (Python challenge, FindTheFlaw, PhishingEmail,
 * SQL, Git…) in a tree, each at its tag.
 */
function exerciseProblems(tree: ReactNode, places: Map<string, MdxPlace[]>): PlacedProblem[] {
  const found: PlacedProblem[] = [];
  const seen = new Map<LessonComponentName, number>();
  const walk = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child as ReactNode);
      return;
    }
    if (!isValidElement(node)) return;

    // SAFETY: a React element's props are an object; the children are walked,
    // and the whole object goes to the exercise's parser, which takes unknown.
    const props = node.props as Record<string, unknown> & { children?: ReactNode };
    const name = STUB_NAMES.get(node.type);
    if (name !== undefined) {
      const index = seen.get(name) ?? 0;
      seen.set(name, index + 1);
      const problem = EXERCISE_CHECKS[name]?.(props) ?? null;
      if (problem !== null) {
        const at = places.get(name)?.[index] ?? { line: 1, column: 1 };
        found.push({ message: problem, ...at });
      }
    }
    if (props.children !== undefined) walk(props.children);
  };
  walk(tree);
  return found;
}

/** What each exercise's component would refuse in its props, or null. */
const EXERCISE_CHECKS: Partial<
  Record<LessonComponentName, (props: Record<string, unknown>) => string | null>
> = {
  PythonChallenge: (props) => {
    const parsed = parseChallengeTests(props.tests);
    return parsed.ok ? null : `Défi Python : ${parsed.problem}`;
  },
  FindTheFlaw: (props) => {
    const parsed = parseFindTheFlaw(props);
    return parsed.ok ? null : `Trouve la faille : ${parsed.problem}`;
  },
  PhishingEmail: (props) => {
    const parsed = parsePhishingEmail(props);
    return parsed.ok ? null : `Boîte mail piégée : ${parsed.problem}`;
  },
  SqlPlayground: (props) => {
    const parsed = parseSqlPlayground(props);
    return parsed.ok ? null : `Exercice SQL : ${parsed.problem}`;
  },
  SqlInjectionLab: (props) => {
    const parsed = parseSqlInjectionLab(props);
    return parsed.ok ? null : `Laboratoire d'injection SQL : ${parsed.problem}`;
  },
  GitSandbox: (props) => {
    const parsed = parseGitSandbox(props);
    if (!parsed.ok) return `Bac à sable Git : ${parsed.problem}`;
    // The repository the exercise starts from must exist: each setup line is played.
    const setup = runSetup(parsed.value.setup ?? []);
    if (setup.ok) return null;
    const why = setup.output.split("\n")[0] ?? "";
    return `Bac à sable Git : la commande de préparation « ${setup.command} » échoue (${why}).`;
  },
  PhotoOsint: (props) => {
    const parsed = parsePhotoOsint(props);
    return parsed.ok ? null : `Exercice OSINT : ${parsed.problem}`;
  },
  NetworkLab: (props) => {
    const parsed = parseNetworkLab(props);
    if (!parsed.ok) return `Atelier réseau : ${parsed.problem}`;
    // Cables to devices that exist, addresses that parse: the engine builds the network.
    const built = buildNetwork(parsed.value);
    return built.ok ? null : `Atelier réseau : ${built.problem}`;
  },
  StepAnimation: (props) => {
    const parsed = parseStepAnimation(props);
    return parsed.ok ? null : `Animation : ${parsed.problem}`;
  },
  PhpLab: (props) => {
    const parsed = parsePhpLab(props);
    return parsed.ok ? null : `Laboratoire PHP : ${parsed.problem}`;
  },
  SubnetDrill: (props) => {
    const parsed = parseSubnetDrill(props);
    return parsed.ok ? null : `Calcul de sous-réseaux : ${parsed.problem}`;
  },
  PacketDissector: (props) => {
    const parsed = parsePacketDissector(props);
    if (!parsed.ok) return `Décortiquer un paquet : ${parsed.problem}`;
    // The fields to find must be in the frame as described: the frame is built.
    const missing = missingFields(buildFrame(parsed.value.frame), parsed.value.find ?? []);
    if (missing.length === 0) return null;
    return `Décortiquer un paquet : find nomme ${missing.map((id) => `« ${id} »`).join(", ")}, que cette trame n'a pas.`;
  },
  PutInOrder: (props) => {
    const parsed = parsePutInOrder(props);
    return parsed.ok ? null : `Dans l'ordre : ${parsed.problem}`;
  },
  MatchPairs: (props) => {
    const parsed = parseMatchPairs(props);
    return parsed.ok ? null : `Associe : ${parsed.problem}`;
  },
  CryptoWorkshop: (props) => {
    const parsed = parseCryptoWorkshop(props);
    return parsed.ok ? null : `Atelier crypto : ${parsed.problem}`;
  },
  FirewallLab: (props) => {
    const parsed = parseFirewallLab(props);
    if (!parsed.ok) return `Pare-feu : ${parsed.problem}`;
    // The rules the exercise starts with must read: they are the learner's starting point.
    const rules = parseRules(parsed.value.rules);
    if (rules.ok) return null;
    return `Pare-feu : les règles de départ, ligne ${String(rules.line)} : ${rules.problem}`;
  },
  LogHunt: (props) => {
    const parsed = parseLogHunt(props);
    return parsed.ok ? null : `Chasse dans les logs : ${parsed.problem}`;
  },
  HexEditor: (props) => {
    const parsed = parseHexEditor(props);
    return parsed.ok ? null : `Éditeur hexadécimal : ${parsed.problem}`;
  },
  IncidentStory: (props) => {
    const parsed = parseIncidentStory(props);
    return parsed.ok ? null : `Incident à choix : ${parsed.problem}`;
  },
  JwtLab: (props) => {
    const parsed = parseJwtLab(props);
    return parsed.ok ? null : `Atelier JWT : ${parsed.problem}`;
  },
  PasswordLab: (props) => {
    const parsed = parsePasswordLab(props);
    if (!parsed.ok) return `Atelier mots de passe : ${parsed.problem}`;
    // The goal must be reachable, and exactly that: the dictionary is played against the table.
    const falling = crackableUsers(parsed.value.accounts).length;
    if (falling === parsed.value.weak) return null;
    return `Atelier mots de passe : weak vaut ${String(parsed.value.weak)}, mais le dictionnaire complet casse ${String(falling)} ${falling < 2 ? "compte" : "comptes"} de cette table.`;
  },
};

/**
 * The error in the author's terms, and where the compiler saw it. A refused
 * value already says what to write instead (see remarkLiteralValuesOnly);
 * anything else is the compiler's own first line - a tag left open, a quote
 * that never closes - without the places written into it, which count in the
 * section: the problem's own place is given apart, numbered in the lesson.
 */
function explain(error: unknown): { message: string; place: MdxPlace | null } {
  if (error instanceof LessonMdxValueError) return { message: error.message, place: error.place };
  const raw = error instanceof Error ? error.message : String(error);
  const first = raw.split("\n")[0] ?? raw;
  const written = PLACE_IN_MESSAGE.exec(first);
  const named = written === null ? null : placeIn(written);
  const own = placeOfMessage(error);
  // "Expected a closing tag for `<Callout>` (5:16-5:23) before the end of
  // `paragraph`": the place written in the text is the tag left open, and the
  // message's own place is the paragraph (or emphasis) it was left open in,
  // lines above it. In the other messages that write one, the message's own
  // place is the fault and the written one a tag it relates to.
  const place = first.startsWith("Expected a closing tag for") ? (named ?? own) : (own ?? named);
  return { message: first.replace(PLACE_IN_MESSAGE_ALL, ""), place };
}

/**
 * A place mdast-util-mdx-jsx writes into its messages, as `(3:1-3:10)` or
 * `(3:1)`, at their end or in the middle. A single optional space before it:
 * a run of whitespace matched by `\s*` would make the search quadratic.
 */
const PLACE_IN_MESSAGE = / ?\((\d+):(\d+)(?:-\d+:\d+)?\)/;
const PLACE_IN_MESSAGE_ALL = new RegExp(PLACE_IN_MESSAGE.source, "g");

function placeIn(match: RegExpExecArray): MdxPlace {
  return { line: Number(match[1]), column: Number(match[2]) };
}

/** A VFileMessage's own place: line and column from 1, when it has them. */
function placeOfMessage(error: unknown): MdxPlace | null {
  if (typeof error !== "object" || error === null) return null;
  const { line, column } = error as { line?: unknown; column?: unknown };
  return typeof line === "number" && typeof column === "number" ? { line, column } : null;
}

// ── In the author's words ────────────────────────────────────────────────────

function whereOf(problem: LessonMdxProblem): string {
  return problem.section === "introduction"
    ? "L'introduction"
    : `La section « ${problem.section} »`;
}

function atOf(problem: LessonMdxProblem): string {
  return `ligne ${String(problem.line)}, colonne ${String(problem.column)}`;
}

/**
 * The refusal as one sentence, for a form's error slot: the first problem,
 * with its line and column, and how many others there are. The editor marks
 * them all at their place.
 *
 * Written once so the four editors and the import say it the same way.
 */
export function describeLessonMdxProblem(check: Extract<LessonMdxCheck, { ok: false }>): string {
  const others = check.total - 1;
  const more =
    others <= 0
      ? ""
      : others === 1
        ? " Il y a aussi un autre problème."
        : ` Il y a aussi ${String(others)} autres problèmes.`;
  // It renders, but not as it should: "ne s'afficherait pas" would be untrue.
  if (check.kind !== undefined) {
    return `${whereOf(check)}, ${atOf(check)} : ${check.message} Rien n'a été enregistré.${more}`;
  }
  return `${whereOf(check)} ne s'afficherait pas (${atOf(check)}), donc rien n'a été enregistré. ${check.message}${more}`;
}

/**
 * A result for `typed.trim()`, moved to the places of `typed`. The forms trim
 * the lesson before checking and storing it; the editor shows it as typed,
 * blank lines at the top included, and its marks must land on the right line.
 */
export function asTyped(check: LessonMdxCheck, typed: string): LessonMdxCheck {
  return placedAfter(check, typed.slice(0, typed.length - typed.trimStart().length));
}

/**
 * A result for a text, moved to its places in a longer one where `before`
 * comes first: the whitespace a form trimmed, or a lesson file's frontmatter.
 */
export function placedAfter(check: LessonMdxCheck, before: string): LessonMdxCheck {
  if (check.ok) return check;
  const lines = before.split("\n").length - 1;
  const columns = before.length - (before.lastIndexOf("\n") + 1);
  if (lines === 0 && columns === 0) return check;
  const move = (problem: LessonMdxProblem): LessonMdxProblem => ({
    ...problem,
    line: problem.line + lines,
    column: problem.line === 1 ? problem.column + columns : problem.column,
  });
  return { ...check, ...move(check), problems: check.problems.map(move) };
}

/** A problem as the editor marks it: where, and what to read under the mark. */
export interface LessonEditorProblem {
  line: number;
  column: number;
  message: string;
}

/**
 * The problems of a result for the editor, which marks each at its line:
 * the place needs no words, and a section that would not render says so.
 */
export function editorProblemsOf(check: LessonMdxCheck): LessonEditorProblem[] {
  if (check.ok) return [];
  return check.problems.map((problem) => ({
    line: problem.line,
    column: problem.column,
    message:
      problem.kind === undefined ? `Ne s'afficherait pas : ${problem.message}` : problem.message,
  }));
}

/** One problem as a line of a list, for the import, which lists them all. */
export function describeLessonMdxProblemAt(problem: LessonMdxProblem): string {
  const verdict = problem.kind === undefined ? ", ne s'afficherait pas" : "";
  return `${whereOf(problem)}, ${atOf(problem)}${verdict} : ${problem.message}`;
}
