import {
  componentPropsOf,
  type LessonMdxCheck,
  type LessonMdxProblem,
  lessonMdxProblems,
  lessonMdxResult,
  lessonSectionNamer,
} from "./check.js";
import type { PlacedProblem } from "./attributes.js";
import { extractDiagramSource } from "./diagram-source.js";

/**
 * The rules of the catalogue that a lesson can break while rendering fine.
 *
 * They were CI jobs over content/ and nothing else: a lesson written in the
 * console or by a teacher never met them, and reached readers with the note
 * its author left at the bottom, an em dash, or a diagram that markdown had
 * rewritten before mermaid saw it. Saving now applies them, through
 * checkLessonForSave, each problem at its line and column like the others:
 *
 * - an authoring marker ("OK 03 écrit"): the lesson-markers job's pattern;
 * - an em dash, which French does not punctuate with (scripts/check-typography.mjs);
 * - a diagram that does not reach mermaid as written, the first half of the
 *   lesson-diagrams job (apps/web/scripts/check-lesson-diagrams.mjs).
 *
 * The second half of that job, mermaid's own parser, needs mermaid, which the
 * console does not depend on: `parseDiagram` takes it from whoever has it.
 * Without it, CI stays the net for content/.
 *
 * Its own subpath (@cyberlearn/lib/mdx-authoring): it compiles diagrams with
 * the MDX compiler, which the mobile app's imports must not pull in.
 */

/** A line holding nothing but an authoring note: the lesson-markers job's pattern. */
const AUTHORING_MARKER = /^\s*OK .*crit\s*$/;

/** U+2014, written as an escape: the typography check reads this file too. */
const EM_DASH = "\u2014";

export interface AuthoringOptions {
  /**
   * Mermaid's parser, where mermaid can run: resolves when it reads the
   * diagram, rejects (as mermaid.parse does) when it cannot.
   */
  parseDiagram?: (source: string) => Promise<unknown>;
}

/** Every rule of the catalogue the lesson breaks, each where it does. */
export async function authoringProblems(
  mdx: string,
  options: AuthoringOptions = {},
): Promise<LessonMdxProblem[]> {
  const found = [
    ...markerProblems(mdx),
    ...emDashProblems(mdx),
    ...(await diagramProblems(mdx, options)),
  ];
  // The lesson is read once for every problem's section: a pasted lesson can
  // hold thousands of em dashes.
  const nameAt = lessonSectionNamer(mdx);
  return found.map((problem) => ({
    section: nameAt(problem.line),
    message: problem.message,
    kind: "authoring",
    line: problem.line,
    column: problem.column,
  }));
}

/**
 * What saving a lesson asks: that it renders (checkLessonMdx) and keeps the
 * catalogue's rules. One call, for the console's editors, its import and
 * synchronisation, and the teacher's editor, so no door is wider than another.
 */
export async function checkLessonForSave(
  mdx: string,
  options: AuthoringOptions = {},
): Promise<LessonMdxCheck> {
  const [rendering, authoring] = await Promise.all([
    lessonMdxProblems(mdx),
    authoringProblems(mdx, options),
  ]);
  return lessonMdxResult([...rendering, ...authoring]);
}

// ── Authoring markers ────────────────────────────────────────────────────────

/**
 * 133 of the 192 lessons once ended on a note the author left themselves, "OK
 * 03 écrit", which the import carried into the database and the lesson page
 * rendered as its last paragraph. Valid markdown: only this finds it.
 */
function markerProblems(mdx: string): PlacedProblem[] {
  const found: PlacedProblem[] = [];
  mdx.split("\n").forEach((text, index) => {
    if (!AUTHORING_MARKER.test(text)) return;
    found.push({
      message:
        "Une note de rédaction (« OK … écrit ») est restée dans la leçon : le lecteur la verrait comme un paragraphe. Retire la ligne.",
      line: index + 1,
      column: text.length - text.trimStart().length + 1,
    });
  });
  return found;
}

// ── Typography ───────────────────────────────────────────────────────────────

/**
 * Every em dash, as scripts/check-typography.mjs finds them in content/. Also
 * read over a lesson file's frontmatter: the check refuses one anywhere in the
 * file.
 */
export function emDashProblems(text: string): PlacedProblem[] {
  const found: PlacedProblem[] = [];
  text.split("\n").forEach((line, index) => {
    for (let at = line.indexOf(EM_DASH); at !== -1; at = line.indexOf(EM_DASH, at + 1)) {
      found.push({
        message:
          "Tiret cadratin : la ponctuation française ne l'emploie pas. Remplace-le par deux-points, des virgules, des parenthèses ou un point.",
        line: index + 1,
        column: at + 1,
      });
    }
  });
  return found;
}

/**
 * A field published with the lesson, its title or its description, holds no
 * em dash either: in content/ it sits in the frontmatter, where CI refuses one
 * as it does in the body. For the forms' schemas.
 */
export function holdsNoEmDash(value: string): boolean {
  return !value.includes(EM_DASH);
}

/** What a form says of a field that holds one: "Le titre", "La description". */
export function emDashInField(field: string): string {
  return `${field} contient un tiret cadratin : la ponctuation française ne l'emploie pas. Deux-points, virgules, parenthèses ou point à la place.`;
}

// ── Diagrams ─────────────────────────────────────────────────────────────────

interface DiagramBlock {
  /** The line of its `<Diagram`, from 1. */
  line: number;
  /** The lines between the tags, as written. */
  body: string[];
  /** From the opening tag to the closing one: what is compiled. */
  snippet: string;
}

/**
 * Every `<Diagram>…</Diagram>` block, found as the CI job finds them: an
 * opening tag that starts a line, up to the closing tag that starts a later
 * one. Fenced code is skipped, where a tag is text being shown. A tag never
 * closed is the render check's to report.
 */
function diagramBlocks(mdx: string): DiagramBlock[] {
  const lines = mdx.split("\n");
  const blocks: DiagramBlock[] = [];
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    const marker = /^\s*(`{3,}|~{3,})/.exec(text)?.[1];
    if (fence !== null) {
      if (marker?.startsWith(fence.charAt(0)) === true && marker.length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (marker !== undefined) {
      fence = marker;
      continue;
    }
    if (!/^<Diagram(\s|>)/.test(text) || /\/>\s*$/.test(text)) continue;
    let end = -1;
    for (let j = i + 1; j < lines.length && end === -1; j++) {
      if (lines[j]?.startsWith("</Diagram>") === true) end = j;
    }
    // No closing tag below this one is none below a later one either.
    if (end === -1) break;
    blocks.push({
      line: i + 1,
      body: lines.slice(i + 1, end),
      snippet: lines.slice(i, end + 1).join("\n"),
    });
    i = end;
  }
  return blocks;
}

/** A diagram's lines that mermaid reads: trimmed, the blank ones left out, each with its index. */
function meaningful(lines: readonly string[]): { text: string; index: number }[] {
  return lines
    .map((text, index) => ({ text: text.trim(), index }))
    .filter((line) => line.text !== "");
}

/** At most `max` characters of a line, to quote it. */
function quote(text: string, max = 80): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * The children of <Diagram> are parsed as markdown before mermaid ever sees
 * them, so a label written [x](y) arrives as a link and *mot* as an <em>. The
 * diagram then draws wrong, or not at all, with nothing in the logs. Each one
 * is compiled with the lesson page's own plugins, rebuilt the way the Diagram
 * component rebuilds it, and compared with what was written, indentation and
 * blank lines aside since mermaid ignores them.
 */
async function diagramProblems(mdx: string, options: AuthoringOptions): Promise<PlacedProblem[]> {
  const found: PlacedProblem[] = [];
  for (const block of diagramBlocks(mdx)) {
    let received: string;
    try {
      const [props] = await componentPropsOf(block.snippet, "Diagram");
      // SAFETY: React children, read by the same function the component uses.
      received = extractDiagramSource(
        props?.children as Parameters<typeof extractDiagramSource>[0],
      ).trim();
    } catch {
      // A diagram that does not compile is a section that does not render,
      // which the render check reports with the compiler's words.
      continue;
    }

    const written = meaningful(block.body);
    const receivedLines = meaningful(received.split("\n"));
    const differs = written.findIndex((line, k) => receivedLines[k]?.text !== line.text);
    const k =
      differs !== -1 ? differs : receivedLines.length > written.length ? written.length : -1;
    if (k !== -1) {
      const at = written[k] ?? written[written.length - 1];
      const bodyIndex = at?.index ?? 0;
      const source = block.body[bodyIndex] ?? "";
      const after = receivedLines[k]?.text;
      found.push({
        message: `Ce schéma n'arriverait pas tel quel à Mermaid : le markdown change « ${quote(at?.text ?? "")} » en ${after === undefined ? "rien" : `« ${quote(after)} »`}. Dans un <Diagram>, [texte](lien) devient un lien, *texte* et _texte_ de l'emphase, deux ~ du texte barré : échappe-les ou reformule l'étiquette.`,
        line: block.line + 1 + bodyIndex,
        column: source.length - source.trimStart().length + 1,
      });
      continue;
    }

    if (options.parseDiagram === undefined) continue;
    try {
      await options.parseDiagram(received);
    } catch (error) {
      found.push({ ...mermaidPlace(error, block, received), message: mermaidMessage(error) });
    }
  }
  return found;
}

/**
 * Where mermaid stopped: its line counts in the source it was given, whose
 * meaningful lines are the written ones, in order (the round trip held).
 */
function mermaidPlace(
  error: unknown,
  block: DiagramBlock,
  received: string,
): Omit<PlacedProblem, "message"> {
  // SAFETY: mermaid's parse errors carry the parser's hash; anything else is
  // read as having no place, and points at the tag.
  const line = (error as { hash?: { loc?: { first_line?: unknown } } } | null)?.hash?.loc
    ?.first_line;
  const fallback = { line: block.line, column: 1 };
  if (typeof line !== "number") return fallback;
  const before = received.split("\n").slice(0, line - 1);
  const k = meaningful(before).length;
  const written = meaningful(block.body)[k];
  if (written === undefined) return fallback;
  const source = block.body[written.index] ?? "";
  return {
    line: block.line + 1 + written.index,
    column: source.length - source.trimStart().length + 1,
  };
}

function mermaidMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
  // A parse error ends on what the parser expected and what it got instead.
  const why = lines[lines.length - 1] ?? raw;
  return `Mermaid ne sait pas lire ce schéma (${quote(why, 160)}). Une étiquette qui contient des parenthèses ou des crochets s'écrit entre guillemets : A["x (y)"].`;
}
