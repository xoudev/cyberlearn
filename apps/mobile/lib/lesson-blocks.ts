// Parses a lesson's contentMdx into native-renderable blocks. Lessons are MDX
// with a small documented component set (LESSON_AUTHORING_GUIDE): Callout, Quiz,
// QuizGroup, CodePlayground, PythonChallenge, FindTheFlaw, PhishingEmail, GitSandbox, PhotoOsint,
// NetworkLab, PhpLab, SubnetDrill, PacketDissector, PutInOrder, MatchPairs, CryptoWorkshop,
// FirewallLab, StepAnimation, SimulatedTerminal,
// LinuxTerminal, Diagram. Code is shown, not run: it runs on the site. Interactive web-only
// components become placeholders; Quiz data is extracted so the quiz runs
// natively at the end of the lesson.

import { sceneById } from "@cyberlearn/lib/animations/scenes";
import {
  type CryptoWorkshop,
  type FindTheFlaw,
  type FirewallLab,
  type GitSandbox,
  type MatchPairs,
  type PacketDissector,
  type PhishingEmail,
  type PutInOrder,
  type SubnetDrill,
  parseCryptoWorkshop,
  parseFindTheFlaw,
  parseFirewallLab,
  parseGitSandbox,
  parseMatchPairs,
  parsePacketDissector,
  parsePhishingEmail,
  parsePutInOrder,
  parseSubnetDrill,
} from "@cyberlearn/types";

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
  | {
      /** A PhishingEmail: the suspicious parts of a message to report. */
      kind: "phishing";
      mail: PhishingEmail;
    }
  | {
      /** A GitSandbox: the same simulated repository as the site's, played natively. */
      kind: "git";
      sandbox: GitSandbox;
    }
  | {
      /** A SubnetDrill: the same questions as the site's, drawn and corrected natively. */
      kind: "subnet";
      drill: SubnetDrill;
    }
  | {
      /** A PacketDissector: the same frame as the site's, built and read natively. */
      kind: "packet";
      dissector: PacketDissector;
    }
  | {
      /** A PutInOrder: the same shuffled items as the site's, placed natively. */
      kind: "order";
      exercise: PutInOrder;
    }
  | {
      /** A MatchPairs: the same shuffled right column as the site's, paired natively. */
      kind: "match";
      exercise: MatchPairs;
    }
  | {
      /** A CryptoWorkshop: the same tools as the site's, run natively. */
      kind: "crypto";
      workshop: CryptoWorkshop;
    }
  | {
      /** A FirewallLab: the same rules and test packets as the site's, decided natively. */
      kind: "firewall";
      lab: FirewallLab;
    }
  | {
      /**
       * A SqlPlayground or a SqlInjectionLab: played on the site, where SQLite
       * runs; the app shows what to do and the query in question.
       */
      kind: "sql";
      lab: boolean;
      title: string | null;
      task: string | null;
      query: string | null;
    }
  | {
      /**
       * A PhotoOsint: the photo's metadata and the map are read on the site,
       * where exifr and Leaflet run; the app shows what to look for.
       */
      kind: "osint";
      title: string | null;
      task: string | null;
      caption: string | null;
    }
  | {
      /**
       * A NetworkLab: the canvas, the cables and the ping run on the site;
       * the app shows what to do and the devices the exercise starts with.
       */
      kind: "network";
      title: string | null;
      task: string | null;
      devices: string[];
    }
  | {
      /**
       * A PhpLab: a real PHP runs in the browser on the site only; the app
       * shows what to do and the page the exercise starts with, to read.
       */
      kind: "php";
      title: string | null;
      task: string | null;
      file: string;
      code: string;
    }
  | {
      /**
       * A StepAnimation: drawn on the site; the app lists its steps, which
       * carry what the animation says (@cyberlearn/lib/animations/scenes).
       */
      kind: "animation";
      title: string;
      steps: { title: string; text: string }[];
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
const BODY_RE = /\bbody\s*=\s*\{(\[[\s\S]*?\])\}/;
const CLUES_RE = /\bclues\s*=\s*\{(\[[\s\S]*?\])\}/;
const SETUP_RE = /\bsetup\s*=\s*\{(\[[\s\S]*?\])\}/;
const CHECKS_RE = /\bchecks\s*=\s*\{(\[[\s\S]*?\])\}/;
const COUNT_RE = /\bcount\s*=\s*\{\s*(\d+)\s*\}/;

/**
 * A `prop={[...]}` of objects written as JSON (keys in double quotes, as the
 * authoring guide asks), or undefined when it is not.
 */
function jsonArrayProp(tag: string, re: RegExp): unknown {
  const raw = re.exec(tag)?.[1];
  if (raw === undefined) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return value;
  } catch {
    return undefined;
  }
}

const SPACE = /\s/;
const WORD = /[A-Za-z0-9_]/;

/**
 * The index of the `{` opening `name={`, the name read as a whole word with
 * spaces allowed around the `=`; -1 when the tag has no such prop. Written
 * without a regex built from `name`: a pattern made of a string is what a
 * lesson could not be trusted with, so none is ever built.
 */
function openingBraceOf(tag: string, name: string): number {
  let from = 0;
  for (;;) {
    const at = tag.indexOf(name, from);
    if (at === -1) return -1;
    from = at + 1;
    if (at > 0 && WORD.test(tag.charAt(at - 1))) continue;
    let i = at + name.length;
    while (SPACE.test(tag.charAt(i))) i++;
    if (tag.charAt(i) !== "=") continue;
    i++;
    while (SPACE.test(tag.charAt(i))) i++;
    if (tag.charAt(i) === "{") return i;
  }
}

/**
 * A `prop={...}` written as JSON with nested arrays inside (a device's
 * routes in a NetworkLab), which the lazy regexes above would cut short:
 * the braces are counted instead, strings skipped.
 */
function jsonProp(tag: string, name: string): unknown {
  const open = openingBraceOf(tag, name);
  if (open === -1) return undefined;
  let depth = 0;
  let inString = false;
  for (let i = open; i < tag.length; i++) {
    const ch = tag.charAt(i);
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          const value: unknown = JSON.parse(tag.slice(open + 1, i));
          return value;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/**
 * The tag without its `name={...}` prop. The braces are counted, strings and
 * template literals skipped, so that what the prop holds (the PHP pages of a
 * PhpLab, where `$title = "x"` is common) is not read as props of the element.
 */
function withoutProp(tag: string, name: string): string {
  const open = openingBraceOf(tag, name);
  if (open === -1) return tag;
  let depth = 0;
  for (let i = open; i < tag.length; i++) {
    const ch = tag.charAt(i);
    if (ch === '"' || ch === "`") {
      i++;
      while (i < tag.length && tag.charAt(i) !== ch) i += tag.charAt(i) === "\\" ? 2 : 1;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return tag.slice(0, tag.lastIndexOf(name, open)) + tag.slice(i + 1);
    }
  }
  return tag;
}

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
  | "hint"
  | "fromName"
  | "fromAddress"
  | "subject"
  | "linkText"
  | "linkUrl"
  | "attachment"
  | "conclusion"
  | "task"
  | "goal"
  | "starterQuery"
  | "query"
  | "caption"
  | "scene"
  | "file"
  | "input"
  | "rules";

/**
 * Every string prop of a tag, written `name="..."`, `` name={`...`} `` or
 * `name={"..."}`. Read left to right, so a value is consumed whole: code that
 * says `title = "x"` is not taken for the title.
 */
const STRING_PROP_RE =
  /\b(starterCode|title|description|id|language|code|explanation|hint|fromName|fromAddress|subject|linkText|linkUrl|attachment|conclusion|task|goal|starterQuery|query|caption|scene|file|input|rules)\s*=\s*(?:"([^"]*)"|\{\s*`((?:[^`\\]|\\[\s\S])*)`\s*\}|\{\s*"((?:[^"\\]|\\.)*)"\s*\})/g;

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
  // PhishingEmail → the same exercise, played natively; one the site would
  // refuse is a placeholder.
  text = replaceSelfClosing(text, "PhishingEmail", (tag) => {
    const parsed = parsePhishingEmail({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      fromName: stringProp(tag, "fromName", 0) ?? undefined,
      fromAddress: stringProp(tag, "fromAddress", 0) ?? undefined,
      subject: stringProp(tag, "subject", 0) ?? undefined,
      body: extractStringArray(tag, BODY_RE),
      linkText: stringProp(tag, "linkText", 0) ?? undefined,
      linkUrl: stringProp(tag, "linkUrl", 0) ?? undefined,
      attachment: stringProp(tag, "attachment", 0) ?? undefined,
      clues: jsonArrayProp(tag, CLUES_RE),
      conclusion: stringProp(tag, "conclusion", 0) ?? undefined,
    });
    return put(
      parsed.ok
        ? { kind: "phishing", mail: parsed.mail }
        : { kind: "placeholder", label: "Boîte mail piégée" },
    );
  });
  // GitSandbox → the same exercise, played natively on the same engine; one the
  // site would refuse is a placeholder.
  text = replaceSelfClosing(text, "GitSandbox", (tag) => {
    const parsed = parseGitSandbox({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      setup: jsonArrayProp(tag, SETUP_RE),
      task: stringProp(tag, "task", 0) ?? undefined,
      checks: jsonArrayProp(tag, CHECKS_RE),
      hints: jsonArrayProp(tag, HINTS_RE),
    });
    return put(
      parsed.ok
        ? { kind: "git", sandbox: parsed.value }
        : { kind: "placeholder", label: "Bac à sable Git" },
    );
  });
  // SqlPlayground, SqlInjectionLab → a card: a real SQLite runs on the site
  // only (docs/MOBILE_PARITY.md); the lesson still says what to practise.
  text = replaceSelfClosing(text, "SqlPlayground", (tag, indent) =>
    put({
      kind: "sql",
      lab: false,
      title: stringProp(tag, "title", 0),
      task: stringProp(tag, "task", 0),
      query: stringProp(tag, "starterQuery", indent),
    }),
  );
  text = replaceSelfClosing(text, "SqlInjectionLab", (tag, indent) =>
    put({
      kind: "sql",
      lab: true,
      title: stringProp(tag, "title", 0),
      task: stringProp(tag, "goal", 0),
      query: stringProp(tag, "query", indent),
    }),
  );
  // PhotoOsint → a card: the metadata and the map are read on the site only
  // (docs/MOBILE_PARITY.md); the lesson still says what to look for.
  text = replaceSelfClosing(text, "PhotoOsint", (tag) =>
    put({
      kind: "osint",
      title: stringProp(tag, "title", 0),
      task: stringProp(tag, "task", 0),
      caption: stringProp(tag, "caption", 0),
    }),
  );
  // NetworkLab → a card: the canvas and the ping run on the site only
  // (docs/MOBILE_PARITY.md); the lesson still says what to build.
  text = replaceSelfClosing(text, "NetworkLab", (tag) => {
    const devices = jsonProp(tag, "devices");
    const names = Array.isArray(devices)
      ? devices.map((d: unknown) => {
          const device =
            typeof d === "object" && d !== null ? (d as { name?: unknown; kind?: unknown }) : {};
          const kind =
            device.kind === "pc" ? "PC" : device.kind === "switch" ? "switch" : "routeur";
          return typeof device.name === "string" ? `${device.name} (${kind})` : null;
        })
      : [];
    return put({
      kind: "network",
      title: stringProp(tag, "title", 0),
      task: stringProp(tag, "task", 0),
      devices: names.filter((n): n is string => n !== null),
    });
  });
  // PhpLab → a card: PHP runs in the browser on the site only
  // (docs/MOBILE_PARITY.md); the lesson still says what to attack and shows the page.
  text = replaceSelfClosing(text, "PhpLab", (whole, indent) => {
    const tag = withoutProp(whole, "support");
    const code = stringProp(tag, "code", indent);
    if (code === null) return put({ kind: "placeholder", label: "Site vulnérable" });
    return put({
      kind: "php",
      title: stringProp(tag, "title", 0),
      task: stringProp(tag, "task", 0),
      file: stringProp(tag, "file", 0) ?? "index.php",
      code,
    });
  });
  // SubnetDrill → the same exercise, drawn and corrected natively; one the
  // site would refuse is a placeholder.
  text = replaceSelfClosing(text, "SubnetDrill", (tag) => {
    const parsed = parseSubnetDrill({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      task: stringProp(tag, "task", 0) ?? undefined,
      kinds: jsonProp(tag, "kinds"),
      prefixes: jsonProp(tag, "prefixes"),
      count: numberProp(tag, COUNT_RE),
    });
    return put(
      parsed.ok
        ? { kind: "subnet", drill: parsed.value }
        : { kind: "placeholder", label: "Calcul de sous-réseaux" },
    );
  });
  // PacketDissector → the same frame, built and read natively; one the site
  // would refuse is a placeholder.
  text = replaceSelfClosing(text, "PacketDissector", (tag) => {
    const parsed = parsePacketDissector({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      task: stringProp(tag, "task", 0) ?? undefined,
      frame: jsonProp(tag, "frame"),
      find: jsonProp(tag, "find"),
    });
    return put(
      parsed.ok
        ? { kind: "packet", dissector: parsed.value }
        : { kind: "placeholder", label: "Décortiquer un paquet" },
    );
  });
  // PutInOrder, MatchPairs → the same exercises, played natively; one the site
  // would refuse is a placeholder.
  text = replaceSelfClosing(text, "PutInOrder", (tag) => {
    const parsed = parsePutInOrder({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      task: stringProp(tag, "task", 0) ?? undefined,
      items: jsonProp(tag, "items"),
      explanation: stringProp(tag, "explanation", 0) ?? undefined,
      hint: stringProp(tag, "hint", 0) ?? undefined,
    });
    return put(
      parsed.ok
        ? { kind: "order", exercise: parsed.value }
        : { kind: "placeholder", label: "Dans l'ordre" },
    );
  });
  text = replaceSelfClosing(text, "MatchPairs", (tag) => {
    const parsed = parseMatchPairs({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      task: stringProp(tag, "task", 0) ?? undefined,
      pairs: jsonProp(tag, "pairs"),
      explanation: stringProp(tag, "explanation", 0) ?? undefined,
      hint: stringProp(tag, "hint", 0) ?? undefined,
    });
    return put(
      parsed.ok
        ? { kind: "match", exercise: parsed.value }
        : { kind: "placeholder", label: "Associe" },
    );
  });
  // CryptoWorkshop → the same bench, run natively; one the site would refuse
  // is a placeholder.
  text = replaceSelfClosing(text, "CryptoWorkshop", (tag) => {
    const parsed = parseCryptoWorkshop({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      task: stringProp(tag, "task", 0) ?? undefined,
      tools: jsonProp(tag, "tools"),
      input: stringProp(tag, "input", 0) ?? undefined,
      challenge: jsonProp(tag, "challenge"),
    });
    return put(
      parsed.ok
        ? { kind: "crypto", workshop: parsed.value }
        : { kind: "placeholder", label: "Atelier crypto" },
    );
  });
  // FirewallLab → the same lab, decided natively; one the site would refuse is
  // a placeholder.
  text = replaceSelfClosing(text, "FirewallLab", (tag, indent) => {
    const parsed = parseFirewallLab({
      id: stringProp(tag, "id", 0) ?? undefined,
      title: stringProp(tag, "title", 0) ?? undefined,
      task: stringProp(tag, "task", 0) ?? undefined,
      rules: stringProp(tag, "rules", indent) ?? undefined,
      probes: jsonProp(tag, "probes"),
      hints: jsonProp(tag, "hints"),
    });
    return put(
      parsed.ok
        ? { kind: "firewall", lab: parsed.value }
        : { kind: "placeholder", label: "Pare-feu" },
    );
  });
  // StepAnimation → its steps as a list: the drawing is the site's
  // (docs/MOBILE_PARITY.md), the words are shared.
  text = replaceSelfClosing(text, "StepAnimation", (tag) => {
    const scene = sceneById(stringProp(tag, "scene", 0) ?? "");
    if (!scene) return put({ kind: "placeholder", label: "Animation" });
    return put({
      kind: "animation",
      title: stringProp(tag, "title", 0) ?? scene.title,
      steps: scene.steps.map((s) => ({ title: s.title, text: s.text })),
    });
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
