// Parses a lesson's contentMdx into native-renderable blocks. Lessons are MDX
// with a small documented component set (LESSON_AUTHORING_GUIDE): Callout, Quiz,
// QuizGroup, CodePlayground, SimulatedTerminal, Diagram. Interactive web-only
// components become placeholders; Quiz data is extracted so the quiz runs
// natively at the end of the lesson.

export interface QuizBlock {
  kind: "quiz";
  id: string;
  question: string;
  options: string[];
  correct: number;
}

export type Block =
  | { kind: "h3"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; lang: string; code: string }
  | { kind: "playground"; lang: string; code: string }
  | { kind: "terminal"; title: string | null; commands: string[]; hints: string[] }
  | { kind: "callout"; type: "info" | "warning" | "danger" | "success"; text: string }
  | { kind: "placeholder"; label: string }
  | QuizBlock;

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
  return {
    kind: "quiz",
    id,
    question: question.replace(/\\"/g, '"'),
    options,
    correct: Number(correctRaw),
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
  // lesson reads in full; execution stays on the web sandbox).
  text = text.replace(
    /<CodePlayground([^>]*)>([\s\S]*?)<\/CodePlayground>/g,
    (_m, attrs: string, body: string) => {
      const lang = /language\s*=\s*"(\w+)"/.exec(attrs)?.[1] ?? "code";
      return put({ kind: "playground", lang, code: body.replace(/^\n+|\n+$/g, "") });
    },
  );
  // SimulatedTerminal → a native exercise card (commands to try + hints).
  const terminalToBlock = (tag: string): string =>
    put({
      kind: "terminal",
      title: /title\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(tag)?.[1] ?? null,
      commands: extractStringArray(tag, EXPECTED_CMDS_RE),
      hints: extractStringArray(tag, HINTS_RE),
    });
  text = text.replace(/<SimulatedTerminal[\s\S]*?\/>/g, terminalToBlock);
  text = text.replace(/<SimulatedTerminal[\s\S]*?<\/SimulatedTerminal>/g, terminalToBlock);
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
