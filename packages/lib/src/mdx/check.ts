import { evaluate } from "@mdx-js/mdx";
import { quizProblem } from "./quizzes.js";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import {
  parseChallengeTests,
  parseCryptoWorkshop,
  parseFindTheFlaw,
  parseGitSandbox,
  parseMatchPairs,
  parseNetworkLab,
  parsePacketDissector,
  parsePhpLab,
  parsePhishingEmail,
  parsePhotoOsint,
  parsePutInOrder,
  parseStepAnimation,
  parseSqlInjectionLab,
  parseSqlPlayground,
  parseSubnetDrill,
} from "@cyberlearn/types";
import { runSetup } from "../git/sandbox";
import { buildFrame, missingFields } from "../network/packet";
import { buildNetwork } from "../network/topology";
import { protectPropIndentation } from "./indentation.js";
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
export const LESSON_COMPONENT_NAMES = [
  "Quiz",
  "QuizGroup",
  "CodePlayground",
  "SimulatedTerminal",
  "LinuxTerminal",
  "LessonVideo",
  "LessonImage",
  "ExternalLink",
  "Callout",
  "Diagram",
  "PythonChallenge",
  "FindTheFlaw",
  "PhishingEmail",
  "SqlPlayground",
  "SqlInjectionLab",
  "GitSandbox",
  "PhotoOsint",
  "NetworkLab",
  "StepAnimation",
  "PhpLab",
  "SubnetDrill",
  "PacketDissector",
  "PutInOrder",
  "MatchPairs",
  "CryptoWorkshop",
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
function FindTheFlawStub(): null {
  return null;
}
STUBS.FindTheFlaw = FindTheFlawStub;
function PhishingEmailStub(): null {
  return null;
}
STUBS.PhishingEmail = PhishingEmailStub;
function SqlPlaygroundStub(): null {
  return null;
}
STUBS.SqlPlayground = SqlPlaygroundStub;
function SqlInjectionLabStub(): null {
  return null;
}
STUBS.SqlInjectionLab = SqlInjectionLabStub;
function GitSandboxStub(): null {
  return null;
}
STUBS.GitSandbox = GitSandboxStub;
function PhotoOsintStub(): null {
  return null;
}
STUBS.PhotoOsint = PhotoOsintStub;
function NetworkLabStub(): null {
  return null;
}
STUBS.NetworkLab = NetworkLabStub;
function StepAnimationStub(): null {
  return null;
}
STUBS.StepAnimation = StepAnimationStub;
function PhpLabStub(): null {
  return null;
}
STUBS.PhpLab = PhpLabStub;
function SubnetDrillStub(): null {
  return null;
}
STUBS.SubnetDrill = SubnetDrillStub;
function PacketDissectorStub(): null {
  return null;
}
STUBS.PacketDissector = PacketDissectorStub;
function PutInOrderStub(): null {
  return null;
}
STUBS.PutInOrder = PutInOrderStub;
function MatchPairsStub(): null {
  return null;
}
STUBS.MatchPairs = MatchPairsStub;
function CryptoWorkshopStub(): null {
  return null;
}
STUBS.CryptoWorkshop = CryptoWorkshopStub;

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

/**
 * The props each `<name>` of a lesson is given, as the page compiles them: the
 * same sections, the same plugins, the same protection for indentation. For
 * the tests that play a lesson's exercises on their engines, which must read
 * what the lesson says rather than a copy of it. Nothing is rendered: the
 * element tree is only read.
 */
export async function componentPropsOf(
  mdx: string,
  name: (typeof LESSON_COMPONENT_NAMES)[number],
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
  for (const source of splitMdxSections(mdx)) {
    const { default: Content } = await evaluate(protectPropIndentation(source), {
      ...runtime,
      remarkPlugins: LESSON_REMARK_PLUGINS,
      development: false,
    });
    // SAFETY: as in problemIn, the default export is the content function.
    collect((Content as unknown as MdxContent)({ components: { ...STUBS, [name]: capture } }));
  }
  return found;
}

/** What is wrong with one piece of MDX, or null when it renders. */
async function problemIn(source: string): Promise<string | null> {
  try {
    // The same source the page compiles: see indentation.ts.
    const { default: Content } = await evaluate(protectPropIndentation(source), {
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

/** The first misconfigured exercise (Python challenge, FindTheFlaw, PhishingEmail, SQL, Git) in a tree, or null. */
function firstChallengeProblem(node: ReactNode): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstChallengeProblem(child as ReactNode);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;

  // SAFETY: a React element's props are an object; these two are read, and a
  // FindTheFlaw's or PhishingEmail's whole object goes to its parser, which takes unknown.
  const props = node.props as { tests?: unknown; children?: ReactNode };
  if (node.type === ChallengeStub) {
    const parsed = parseChallengeTests(props.tests);
    if (!parsed.ok) return `Défi Python : ${parsed.problem}`;
  }
  if (node.type === FindTheFlawStub) {
    const parsed = parseFindTheFlaw(props);
    if (!parsed.ok) return `Trouve la faille : ${parsed.problem}`;
  }
  if (node.type === PhishingEmailStub) {
    const parsed = parsePhishingEmail(props);
    if (!parsed.ok) return `Boîte mail piégée : ${parsed.problem}`;
  }
  if (node.type === SqlPlaygroundStub) {
    const parsed = parseSqlPlayground(props);
    if (!parsed.ok) return `Exercice SQL : ${parsed.problem}`;
  }
  if (node.type === SqlInjectionLabStub) {
    const parsed = parseSqlInjectionLab(props);
    if (!parsed.ok) return `Laboratoire d'injection SQL : ${parsed.problem}`;
  }
  if (node.type === GitSandboxStub) {
    const parsed = parseGitSandbox(props);
    if (!parsed.ok) return `Bac à sable Git : ${parsed.problem}`;
    // The repository the exercise starts from must exist: each setup line is played.
    const setup = runSetup(parsed.value.setup ?? []);
    if (!setup.ok) {
      const why = setup.output.split("\n")[0] ?? "";
      return `Bac à sable Git : la commande de préparation « ${setup.command} » échoue (${why}).`;
    }
  }
  if (node.type === PhotoOsintStub) {
    const parsed = parsePhotoOsint(props);
    if (!parsed.ok) return `Exercice OSINT : ${parsed.problem}`;
  }
  if (node.type === NetworkLabStub) {
    const parsed = parseNetworkLab(props);
    if (!parsed.ok) return `Atelier réseau : ${parsed.problem}`;
    // Cables to devices that exist, addresses that parse: the engine builds the network.
    const built = buildNetwork(parsed.value);
    if (!built.ok) return `Atelier réseau : ${built.problem}`;
  }
  if (node.type === StepAnimationStub) {
    const parsed = parseStepAnimation(props);
    if (!parsed.ok) return `Animation : ${parsed.problem}`;
  }
  if (node.type === PhpLabStub) {
    const parsed = parsePhpLab(props);
    if (!parsed.ok) return `Laboratoire PHP : ${parsed.problem}`;
  }
  if (node.type === SubnetDrillStub) {
    const parsed = parseSubnetDrill(props);
    if (!parsed.ok) return `Calcul de sous-réseaux : ${parsed.problem}`;
  }
  if (node.type === PacketDissectorStub) {
    const parsed = parsePacketDissector(props);
    if (!parsed.ok) return `Décortiquer un paquet : ${parsed.problem}`;
    // The fields to find must be in the frame as described: the frame is built.
    const missing = missingFields(buildFrame(parsed.value.frame), parsed.value.find ?? []);
    if (missing.length > 0) {
      return `Décortiquer un paquet : find nomme ${missing.map((id) => `« ${id} »`).join(", ")}, que cette trame n'a pas.`;
    }
  }
  if (node.type === PutInOrderStub) {
    const parsed = parsePutInOrder(props);
    if (!parsed.ok) return `Dans l'ordre : ${parsed.problem}`;
  }
  if (node.type === MatchPairsStub) {
    const parsed = parseMatchPairs(props);
    if (!parsed.ok) return `Associe : ${parsed.problem}`;
  }
  if (node.type === CryptoWorkshopStub) {
    const parsed = parseCryptoWorkshop(props);
    if (!parsed.ok) return `Atelier crypto : ${parsed.problem}`;
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
