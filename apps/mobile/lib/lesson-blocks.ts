// Parses a lesson's contentMdx into native-renderable blocks. Lessons are MDX
// with a small documented component set (LESSON_AUTHORING_GUIDE): Callout, Quiz,
// QuizGroup, CodePlayground, PythonChallenge, FindTheFlaw, SimulatedTerminal, LinuxTerminal,
// Diagram. Code is shown, not run: it runs on the site. Interactive web-only
// components become placeholders; Quiz data is extracted so the quiz runs
// natively at the end of the lesson.

import { type FindTheFlaw, parseFindTheFlaw } from "@cyberlearn/types";

export interface QuizBlock {
  kind: "quiz";
  id: string;
  question: string;
  options: string[];
  correct: number;
  /** Why the right answer is right, shown once the question is answered. */
  explanation: string | null;
}

export type Block =
  | { kind: "h3"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; lang: string; code: string }
  | { kind: "playground"; lang: string; code: string }
  | {
      /** A PythonChallenge: the statement, the starting code and the tests to pass. */
      kind: "challenge";
      title: string;
      description: string | null;
      code: string;
      tests: ChallengeTest[];
    }
  | {
      kind: "terminal";
      title: string | null;
      commands: string[];
      hints: string[];
      /** A timed exercise on the site, such as a path's practical exam. */
      timeLimitMinutes?: number;
    }
  | { kind: "callout"; type: "info" | "warning" | "danger" | "success"; text: string }
  | {
      /** A FindTheFlaw: the vulnerable line to click, then the flaw to name. */
      kind: "flaw";
      flaw: FindTheFlaw;
    }
  | { kind: "placeholder"; label: string }
  | QuizBlock;

export interface ChallengeTest {
  /** The Python expression evaluated, `solution(5)`. */
  input: string;
  /** What `str()` of it must give. */
  expected: string;
  label: string | null;
}

export interface LessonSection {
  title: string;
  blocks: Block[];
}

export interface ParsedLesson {
  sections: LessonSection[];
  quizzes: QuizBlock[];
}

const EXPECTED_CMDS_RE = /expectedCommands\s*=\s*\{(\[[\s\S]*?\])\}/;
const HINTS_RE = /hints\s*=\s*\{(\[[\s\S]*?\])\}/;
const TIME_LIMIT_RE = /timeLimitMinutes\s*=\s*\{\s*(\d+)\s*\}/;
const LINE_RE = /\bline\s*=\s*\{\s*(\d+)\s*\}/;
const CORRECT_RE = /\bcorrect\s*=\s*\{\s*(\d+)\s*\}/;
const OPTIONS_RE = /\boptions\s*=\s*\{(\[[\s\S]*?\])\}/;

/** A `prop={12}` number, or undefined when it is not written so. */
function numberProp(tag: string, re: RegExp): number | undefined {
  const raw = re.exec(tag)?.[1];
  return raw === undefined ? undefined : Number(raw);
}

/** Extract a `prop={["a","b"]}` string array from a JSX tag's attributes. */
function extractStringArray(tag: string, re: RegExp): string[] {
  const raw = re.exec(tag)?.[1];
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((o) => String(o));
  } catch {
    return raw
      .replace(/^\[|\]$/g, "")
      .split(/",\s*"/)
      .map((s) => s.replace(/^\s*"|"\s*$/g, "").trim())
      .filter(Boolean);
  }
  return [];
}

function extractQuiz(tag: string): QuizBlock | null {
  const question = /question\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(tag)?.[1];
  const id = /id\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(tag)?.[1] ?? `q-${String(Math.random())}`;
  const correctRaw = /correct\s*=\s*\{\s*(\d+)\s*\}/.exec(tag)?.[1];
  const optionsRaw = /options\s*=\s*\{(\[[\s\S]*?\])\}/.exec(tag)?.[1];
  if (!question || !optionsRaw || correctRaw === undefined) return null;
  let options: string[] = [];
  try {
    const parsed: unknown = JSON.parse(optionsRaw);
    if (Array.isArray(parsed)) options = parsed.map((o) => String(o));
  } catch {
    // Tolerant fallback: strip brackets/quotes and split on commas.
    options = optionsRaw
      .replace(/^\[|\]$/g, "")
      .split(/",\s*"/)
      .map((s) => s.replace(/^\s*"|"\s*$/g, ""));
  }
  if (options.length < 2) return null;
  const explanation = /explanation\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(tag)?.[1];
  return {
    kind: "quiz",
    id,
    question: question.replace(/\\"/g, '"'),
    options,
    correct: Number(correctRaw),
    explanation: explanation ? explanation.replace(/\\"/g, '"') : null,
  };
}

/** Parse inline-capable body text into blocks (paragraphs, lists, h3, code). */
function parseBody(text: string, blocks: Block[]): void {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (trimmed === "") {
      i++;
      continue;
    }
    // Fenced code
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        body.push(lines[i] ?? "");
        i++;
      }
      i++; // closing fence
      blocks.push({ kind: "code", lang, code: body.join("\n") });
      continue;
    }
    // H3 / H4 → h3 block
    const h = /^#{3,4}\s+(.*)$/.exec(trimmed);
    if (h?.[1]) {
      blocks.push({ kind: "h3", text: h[1] });
      i++;
      continue;
    }
    // Lists
    const isUl = /^[-*+]\s+/.test(trimmed);
    const isOl = /^\d+\.\s+/.test(trimmed);
    if (isUl || isOl) {
      const items: string[] = [];
      while (i < lines.length) {
        const l = (lines[i] ?? "").trim();
        if (/^[-*+]\s+/.test(l)) items.push(l.replace(/^[-*+]\s+/, ""));
        else if (/^\d+\.\s+/.test(l)) items.push(l.replace(/^\d+\.\s+/, ""));
        else break;
        i++;
      }
      blocks.push({ kind: "list", ordered: isOl, items });
      continue;
    }
    // Paragraph: gather until blank line or block starter
    const para: string[] = [];
    while (i < lines.length) {
      const l = (lines[i] ?? "").trim();
      if (
        l === "" ||
        l.startsWith("```") ||
        /^#{2,4}\s+/.test(l) ||
        /^[-*+]\s+/.test(l) ||
        /^\d+\.\s+/.test(l)
      ) {
        break;
      }
      para.push(l);
      i++;
    }
    if (para.length > 0) blocks.push({ kind: "paragraph", text: para.join(" ") });
  }
}

/**
 * The index just past the `>` that closes the tag opening at `start`. Quoted
 * attributes and everything in braces are skipped: the code of a playground
 * holds `>` and `/>` of its own (`if a > b:`).
 */
function endOfTag(s: string, start: number): number {
  let depth = 0;
  let i = start + 1;
  while (i < s.length) {
    const c = s.charAt(i);
    if (c === '"' || c === "'" || (c === "`" && depth > 0)) {
      // A JSX attribute string has no escapes; a JavaScript one, in braces, has.
      i++;
      while (i < s.length && s.charAt(i) !== c) i += depth > 0 && s.charAt(i) === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return i + 1;
    i++;
  }
  return s.length;
}

const JS_ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r" };

/** What a JavaScript string's escapes come to. */
function unescapeJs(raw: string): string {
  return raw.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[\s\S])/g, (_m, e: string) =>
    e.length > 1 ? String.fromCharCode(parseInt(e.slice(1), 16)) : (JS_ESCAPES[e] ?? e),
  );
}

/** The string props the app reads off a playground or a challenge. */
type StringPropName =
  | "starterCode"
  | "title"
  | "description"
  | "id"
  | "language"
  | "code"
  | "explanation"
  | "hint";

/**
 * Every string prop of a tag, written `name="..."`, `` name={`...`} `` or
 * `name={"..."}`. Read left to right, so a value is consumed whole: code that
 * says `title = "x"` is not taken for the title.
 */
const STRING_PROP_RE =
  /\b(starterCode|title|description|id|language|code|explanation|hint)\s*=\s*(?:"([^"]*)"|\{\s*`((?:[^`\\]|\\[\s\S])*)`\s*\}|\{\s*"((?:[^"\\]|\\.)*)"\s*\})/g;

/** A line without the first `indent` spaces or tabs it starts with. */
function dropIndent(line: string, indent: number): string {
  let k = 0;
  while (k < indent && (line.charAt(k) === " " || line.charAt(k) === "\t")) k++;
  return line.slice(k);
}

/**
 * A string prop of a tag. The element's own indent is taken off the lines
 * after the first, as MDX takes it off on the site: it belongs to the list the
 * element sits in, not to the code.
 */
function stringProp(tag: string, name: StringPropName, indent: number): string | null {
  const m = [...tag.matchAll(STRING_PROP_RE)].find((match) => match[1] === name);
  if (!m) return null;
  const value = m[2] ?? unescapeJs(m[3] ?? m[4] ?? "");
  if (indent === 0) return value;
  return value
    .split("\n")
    .map((line, k) => (k === 0 ? line : dropIndent(line, indent)))
    .join("\n");
}

const TEST_CASE_RE =
  /"?input"?\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"?expected"?\s*:\s*"((?:[^"\\]|\\.)*)"(?:\s*,\s*"?label"?\s*:\s*"((?:[^"\\]|\\.)*)")?/g;

/** The test cases of a PythonChallenge, `{ input: "...", expected: "..." }` each. */
function challengeTests(tag: string): ChallengeTest[] {
  const from = tag.search(/\btests\s*=\s*\{/);
  if (from === -1) return [];
  return [...tag.slice(from).matchAll(TEST_CASE_RE)].map((m) => ({
    input: unescapeJs(m[1] ?? ""),
    expected: unescapeJs(m[2] ?? ""),
    label: m[3] === undefined ? null : unescapeJs(m[3]),
  }));
}

/**
 * Each self-closing `<name ... />` of the text, replaced by what `toBlock`
 * makes of its tag and of the indent it is written at. A paired element is
 * left for the caller.
 */
function replaceSelfClosing(
  text: string,
  name: string,
  toBlock: (tag: string, indent: number) => string,
): string {
  let out = "";
  let i = 0;
  for (;;) {
    const start = text.indexOf(`<${name}`, i);
    if (start === -1) break;
    const end = endOfTag(text, start);
    const tag = text.slice(start, end);
    if (!/[\s/]/.test(text.charAt(start + name.length + 1)) || !tag.endsWith("/>")) {
      out += text.slice(i, end);
      i = end;
      continue;
    }
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const before = text.slice(lineStart, start);
    const indent = /^[ \t]*$/.test(before) ? before.length : 0;
    out += text.slice(i, start) + toBlock(tag, indent);
    i = end;
  }
  return out + text.slice(i);
}

/** The time limit of a timed terminal, when it has one. */
function timeLimit(tag: string): { timeLimitMinutes?: number } {
  const minutes = TIME_LIMIT_RE.exec(tag)?.[1];
  return minutes === undefined ? {} : { timeLimitMinutes: Number(minutes) };
}

/** Replace MDX components with sentinel lines, extracting quiz/callout data. */
function preprocess(mdx: string): { text: string; store: Map<string, Block> } {
  const store = new Map<string, Block>();
  let counter = 0;
  const put = (block: Block): string => {
    const key = `\n@@BLOCK_${String(counter++)}@@\n`;
    store.set(key.trim(), block);
    return key;
  };

  let text = mdx.replace(/^---[\s\S]*?---\s*/m, ""); // strip frontmatter if present
  // QuizGroup wrappers: unwrap (inner <Quiz> handled below).
  text = text.replace(/<\/?QuizGroup[^>]*>/g, "\n");
  // Quiz (self-closing)
  text = text.replace(/<Quiz[\s\S]*?\/>/g, (tag) => {
    const quiz = extractQuiz(tag);
    return quiz ? put(quiz) : "\n";
  });
  // Callout (paired)
  text = text.replace(
    /<Callout[^>]*type\s*=\s*"(\w+)"[^>]*>([\s\S]*?)<\/Callout>/g,
    (_m, type: string, body: string) => {
      const valid = ["info", "warning", "danger", "success"].includes(type)
        ? (type as "info" | "warning" | "danger" | "success")
        : "info";
      return put({ kind: "callout", type: valid, text: body.trim() });
    },
  );
  // CodePlayground → a runnable-code block (the source is shown natively so the
  // lesson reads in full; execution stays on the web sandbox). The code is
  // either the starterCode prop of a self-closing element or the children.
  text = replaceSelfClosing(text, "CodePlayground", (tag, indent) =>
    put({
      kind: "playground",
      lang: /language\s*=\s*"(\w+)"/.exec(tag)?.[1] ?? "code",
      code: stringProp(tag, "starterCode", indent) ?? "",
    }),
  );
  // PythonChallenge → the statement, the starting code and the tests; the
  // tests run on the site, like the playgrounds.
  text = replaceSelfClosing(text, "PythonChallenge", (tag, indent) =>
    put({
      kind: "challenge",
      title: stringProp(tag, "title", 0) ?? "Python Challenge",
      description: stringProp(tag, "description", 0),
      code: stringProp(tag, "starterCode", indent) ?? "",
      tests: challengeTests(tag),
    }),
  );
  text = text.replace(
    /<CodePlayground([^>]*)>([\s\S]*?)<\/CodePlayground>/g,
    (_m, attrs: string, body: string) => {
      const lang = /language\s*=\s*"(\w+)"/.exec(attrs)?.[1] ?? "code";
      return put({ kind: "playground", lang, code: body.replace(/^\n+|\n+$/g, "") });
    },
  );
  // FindTheFlaw → the same exercise, played natively; one the site would
  // refuse (see parseFindTheFlaw) is a placeholder rather than a broken card.
  text = replaceSelfClosing(text, "FindTheFlaw", (tag, indent) => {
    const parsed = parseFindTheFlaw({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      language: stringProp(tag, "language", 0) ?? undefined,
      code: stringProp(tag, "code", indent) ?? undefined,
      line: numberProp(tag, LINE_RE),
      options: extractStringArray(tag, OPTIONS_RE),
      correct: numberProp(tag, CORRECT_RE),
      explanation: stringProp(tag, "explanation", 0) ?? undefined,
      hint: stringProp(tag, "hint", 0) ?? undefined,
    });
    return put(
      parsed.ok
        ? { kind: "flaw", flaw: parsed.flaw }
        : { kind: "placeholder", label: "Trouve la faille" },
    );
  });
  // SimulatedTerminal → a native exercise card (commands to try + hints).
  const terminalToBlock = (tag: string): string =>
    put({
      kind: "terminal",
      title: /title\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(tag)?.[1] ?? null,
      commands: extractStringArray(tag, EXPECTED_CMDS_RE),
      hints: extractStringArray(tag, HINTS_RE),
      ...timeLimit(tag),
    });
  text = text.replace(/<SimulatedTerminal[\s\S]*?\/>/g, terminalToBlock);
  text = text.replace(/<SimulatedTerminal[\s\S]*?<\/SimulatedTerminal>/g, terminalToBlock);
  // LinuxTerminal boots a real Linux in the browser: on the site only (see
  // docs/MOBILE_PARITY.md). Here it reads as the same card, the commands and
  // hints the lesson asks for, so the lesson still says what to practise.
  text = text.replace(/<LinuxTerminal[\s\S]*?\/>/g, terminalToBlock);
  // Remaining web-only components (Diagram, media) → labelled placeholder.
  for (const name of ["Diagram", "LessonVideo", "LessonImage"]) {
    const paired = new RegExp(`<${name}[\\s\\S]*?<\\/${name}>`, "g");
    const selfClosing = new RegExp(`<${name}[\\s\\S]*?\\/>`, "g");
    const label = name === "Diagram" ? "Diagramme" : name === "LessonVideo" ? "Vidéo" : "Image";
    text = text.replace(paired, () => put({ kind: "placeholder", label }));
    text = text.replace(selfClosing, () => put({ kind: "placeholder", label }));
  }
  // Any leftover JSX tag lines: drop them defensively.
  text = text.replace(/^\s*<\/?[A-Z][\s\S]*?>\s*$/gm, "");
  return { text, store };
}

/** Full parse: split into H2 sections, resolve sentinels, collect quizzes. */
export function parseLesson(mdx: string): ParsedLesson {
  const { text, store } = preprocess(mdx);
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const sections: LessonSection[] = [];
  let currentTitle = "Introduction";
  let buffer: string[] = [];

  const flush = (): void => {
    const raw = buffer.join("\n").trim();
    buffer = [];
    if (!raw) return;
    const blocks: Block[] = [];
    // Resolve sentinels segment by segment so block order is preserved.
    const parts = raw.split(/(@@BLOCK_\d+@@)/);
    for (const part of parts) {
      const stored = store.get(part.trim());
      if (stored) blocks.push(stored);
      else if (part.trim()) parseBody(part, blocks);
    }
    if (blocks.length > 0) {
      sections.push({ title: currentTitle, blocks });
    }
  };

  for (const line of lines) {
    const h2 = /^##\s+(.*)$/.exec(line.trim());
    if (h2?.[1] && !line.trim().startsWith("###")) {
      flush();
      currentTitle = h2[1];
    } else {
      buffer.push(line);
    }
  }
  flush();
  if (sections.length === 0) {
    sections.push({ title: currentTitle, blocks: [] });
  }

  const quizzes = sections.flatMap((s) =>
    s.blocks.filter((b): b is QuizBlock => b.kind === "quiz"),
  );
  return { sections, quizzes };
}
