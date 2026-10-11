/**
 * A lesson diagram told in words, one line per arrow.
 *
 * Mermaid draws a `<Diagram>` in the browser. When it cannot (a theme colour
 * it could not read broke all 240 lesson diagrams at once in October 2026),
 * the page used to show the mermaid source, which reads like code; and the
 * mobile app has no mermaid at all. Both show this instead:
 *
 * - a flowchart, arrow by arrow: "Périmètre et autorisation → Inventaire : ce
 *   qui existe", an edge's label in parentheses after where it starts, then
 *   each group (subgraph) with what it holds;
 * - a sequence diagram, message by message: "Client → Serveur : SYN";
 * - a git graph, commit by commit, with its branches and merges.
 *
 * Best effort by design. Those three are the kinds the lessons use; any other
 * kind comes back as its statements with the quotes and arrows tidied. It
 * never throws, and an empty list means there was nothing to say.
 *
 * Pure and without dependencies, on its own subpath
 * (@cyberlearn/lib/mdx-diagram-outline), so that the mobile app can use it.
 */
export function diagramOutline(source: string): string[] {
  try {
    const lines = statements(source);
    const header = lines[0];
    if (header === undefined) return [];
    const kind = header.split(/[\s:]/)[0]?.toLowerCase() ?? "";
    const body = lines.slice(1);
    if (kind === "flowchart" || kind === "graph") return flowchartOutline(body);
    if (kind === "sequencediagram") return sequenceOutline(body);
    if (kind === "gitgraph") return gitOutline(body);
    return genericOutline(body);
  } catch {
    // A fallback that throws takes down what it was meant to stand in for:
    // the lesson page around a diagram, a whole lesson in the app.
    return [];
  }
}

const ARROW = "→";
const BOTH_WAYS = "↔";

// ── Statements ───────────────────────────────────────────────────────────────

/**
 * The statements of a diagram, one per line or per `;` outside quotes and
 * brackets, without comments, directives (`%%{init: …}%%`) or front matter.
 */
function statements(source: string): string[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let start = 0;
  // Front matter: a `---` line, the config, and the `---` that closes it.
  while (start < lines.length && lines[start]?.trim() === "") start++;
  if (lines[start]?.trim() === "---") {
    const close = lines.findIndex((line, i) => i > start && line.trim() === "---");
    if (close !== -1) start = close + 1;
  }
  const out: string[] = [];
  for (const line of lines.slice(start)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("%%")) continue;
    for (const part of splitStatements(trimmed)) {
      const statement = part.trim();
      if (statement !== "") out.push(statement);
    }
  }
  return out;
}

/** A line cut at each `;` that is neither quoted nor inside brackets. */
function splitStatements(line: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let from = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (ch === '"') quoted = !quoted;
    else if (quoted) continue;
    else if (ch === "[" || ch === "(" || ch === "{") depth++;
    else if (ch === "]" || ch === ")" || ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) {
      parts.push(line.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(line.slice(from));
  return parts;
}

const ENTITIES: Record<string, string> = {
  quot: '"',
  amp: "&",
  lt: "<",
  gt: ">",
  apos: "'",
  nbsp: " ",
};

/**
 * What a reader sees of a label: without its quotes or the backticks of a
 * markdown string, a `<br/>` read as a space, other tags dropped, and the
 * entity codes mermaid knows (`#quot;`, `#9829;`) put back as characters.
 */
function clean(raw: string): string {
  let text = raw.trim();
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
  if (text.length >= 2 && text.startsWith("`") && text.endsWith("`")) text = text.slice(1, -1);
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/#(\d+);/g, (match, code: string) => {
      const point = Number(code);
      return point <= 0x10ffff ? String.fromCodePoint(point) : match;
    })
    .replace(/#([a-z]+);/g, (match, name: string) => ENTITIES[name] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

/** Statements that only style or configure a diagram, and say nothing. */
const STYLING = /^(classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/;

// ── Flowchart ────────────────────────────────────────────────────────────────

interface FlowEdge {
  from: string;
  to: string;
  label: string | null;
  /** An open link (`---`) or one with a head at each end (`<-->`). */
  bothWays: boolean;
}

interface FlowGroup {
  id: string | null;
  title: string;
  members: string[];
}

function flowchartOutline(body: string[]): string[] {
  const labels = new Map<string, string>();
  const seen: string[] = [];
  const edges: FlowEdge[] = [];
  const groups: FlowGroup[] = [];
  const open: FlowGroup[] = [];

  const meet = (node: FlowNode): void => {
    if (!seen.includes(node.id)) seen.push(node.id);
    if (node.label !== null) labels.set(node.id, node.label);
    const group = open.at(-1);
    if (group && !group.members.includes(node.id)) group.members.push(node.id);
  };

  for (const statement of body) {
    if (STYLING.test(statement)) continue;
    if (statement === "end") {
      open.pop();
      continue;
    }
    const subgraph = /^subgraph\s+(.*)$/.exec(statement);
    if (subgraph) {
      const group = readSubgraph(subgraph[1] ?? "");
      if (group.id !== null) labels.set(group.id, group.title);
      groups.push(group);
      open.push(group);
      continue;
    }
    const chain = readChain(statement);
    for (const nodes of chain.nodes) nodes.forEach(meet);
    chain.links.forEach((link, k) => {
      if (link.hidden) return;
      for (const from of chain.nodes[k] ?? []) {
        for (const to of chain.nodes[k + 1] ?? []) {
          edges.push({ from: from.id, to: to.id, label: link.label, bothWays: link.bothWays });
        }
      }
    });
  }

  const name = (id: string): string => labels.get(id) ?? id;
  const lines = edges.map((edge) => {
    const label = edge.label === null || edge.label === "" ? "" : ` (${edge.label})`;
    return `${name(edge.from)}${label} ${edge.bothWays ? BOTH_WAYS : ARROW} ${name(edge.to)}`;
  });
  // A box no arrow reaches and no group holds would otherwise go unsaid.
  const linked = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const grouped = new Set(groups.flatMap((group) => group.members));
  for (const id of seen) {
    if (!linked.has(id) && !grouped.has(id) && !groups.some((g) => g.id === id)) {
      lines.push(name(id));
    }
  }
  for (const group of groups) {
    if (group.members.length > 0) {
      lines.push(`${group.title} : ${group.members.map(name).join(", ")}`);
    }
  }
  return lines;
}

/** `subgraph id [Titre]`, `subgraph id["Titre"]`, `subgraph "Titre"`, `subgraph Titre`. */
function readSubgraph(rest: string): FlowGroup {
  const withTitle = /^([\p{L}\p{N}_-]+)\s*\[(.*)\]$/u.exec(rest.trim());
  if (withTitle) {
    const id = withTitle[1] ?? "";
    return { id, title: clean(withTitle[2] ?? "") || id, members: [] };
  }
  const title = clean(rest);
  return { id: /^[\p{L}\p{N}_-]+$/u.test(rest.trim()) ? rest.trim() : null, title, members: [] };
}

interface FlowNode {
  id: string;
  label: string | null;
}

interface FlowLink {
  label: string | null;
  bothWays: boolean;
  /** `~~~`: a link mermaid lays out and does not draw. */
  hidden: boolean;
}

/**
 * A statement read as nodes joined by links: `A --> B & C -->|oui| D` is
 * [[A], [B, C], [D]] and the two links between them. Reading stops at the
 * first thing that is neither, keeping what came before.
 */
function readChain(statement: string): { nodes: FlowNode[][]; links: FlowLink[] } {
  const nodes: FlowNode[][] = [];
  const links: FlowLink[] = [];
  let at = 0;
  for (;;) {
    const group: FlowNode[] = [];
    for (;;) {
      at = skipSpaces(statement, at);
      const node = readNode(statement, at);
      if (node === null) break;
      group.push(node.node);
      at = skipSpaces(statement, node.end);
      if (statement.charAt(at) !== "&") break;
      at++;
    }
    if (group.length === 0) break;
    nodes.push(group);
    const link = readLink(statement, at);
    if (link === null) break;
    links.push(link.link);
    at = link.end;
  }
  // A link with nothing after it joins nothing.
  return { nodes, links: links.slice(0, Math.max(0, nodes.length - 1)) };
}

function skipSpaces(text: string, at: number): number {
  let i = at;
  while (i < text.length && /\s/.test(text.charAt(i))) i++;
  return i;
}

const NODE_ID = /^[\p{L}\p{N}_]+(?:-[\p{L}\p{N}_]+)*/u;

/** The shapes a box is drawn in, longest opening first, and how each closes. */
const SHAPES: [string, string[]][] = [
  ["(((", [")))"]],
  ["([", ["])"]],
  ["[[", ["]]"]],
  ["[(", [")]"]],
  ["((", ["))"]],
  ["{{", ["}}"]],
  ["[/", ["/]", "\\]"]],
  ["[\\", ["\\]", "/]"]],
  ["(", [")"]],
  ["[", ["]"]],
  ["{", ["}"]],
  [">", ["]"]],
];

function readNode(text: string, at: number): { node: FlowNode; end: number } | null {
  const id = NODE_ID.exec(text.slice(at))?.[0];
  if (id === undefined) return null;
  let end = at + id.length;
  let label: string | null = null;

  if (text.startsWith("@{", end)) {
    // The newer `A@{ shape: rect, label: "Texte" }` form.
    const close = text.indexOf("}", end);
    const block = text.slice(end, close === -1 ? text.length : close + 1);
    const written = /label:\s*"([^"]*)"/.exec(block)?.[1];
    if (written !== undefined) label = clean(written);
    end = close === -1 ? text.length : close + 1;
  } else {
    const shape = SHAPES.find(([opening]) => text.startsWith(opening, end));
    if (shape) {
      const [opening, closings] = shape;
      let from = end + opening.length;
      // A quoted label may hold the characters that would close the shape.
      const firstChar = skipSpaces(text, from);
      if (text.charAt(firstChar) === '"') {
        const closingQuote = text.indexOf('"', firstChar + 1);
        if (closingQuote !== -1) from = closingQuote + 1;
      }
      const closes = closings
        .map((closing) => ({ closing, index: text.indexOf(closing, from) }))
        .filter((c) => c.index !== -1)
        .sort((a, b) => a.index - b.index);
      const close = closes[0];
      if (close) {
        label = clean(text.slice(end + opening.length, close.index));
        end = close.index + close.closing.length;
      }
    }
  }
  // A class applied in place: `A:::danger`.
  const applied = /^:::[\p{L}\p{N}_-]+/u.exec(text.slice(end))?.[0];
  if (applied !== undefined) end += applied.length;
  return { node: { id, label }, end };
}

/** `-- texte -->`, `== texte ==>`, `-. texte .->`: a link with its text inside. */
const TEXT_LINKS = [
  /^(<?)--\s+(.+?)\s+--+(>|[ox](?![\p{L}\p{N}_]))?/u,
  /^(<?)==\s+(.+?)\s+==+(>|[ox](?![\p{L}\p{N}_]))?/u,
  /^(<?)-\.\s+(.+?)\s+\.+-(>|[ox](?![\p{L}\p{N}_]))?/u,
];

/** `-->`, `---`, `-.->`, `==>`, `<-->`, `--x`, `~~~`. */
const PLAIN_LINK = /^(<?)(?:-{2,}|={2,}|-\.+-|~{3,})(>|[ox](?![\p{L}\p{N}_]))?/u;

function readLink(text: string, at: number): { link: FlowLink; end: number } | null {
  const rest = text.slice(at);
  for (const re of TEXT_LINKS) {
    const m = re.exec(rest);
    if (m) {
      return {
        link: {
          label: clean(m[2] ?? ""),
          bothWays: m[3] === undefined || m[1] === "<",
          hidden: false,
        },
        end: at + m[0].length,
      };
    }
  }
  const m = PLAIN_LINK.exec(rest);
  if (!m) return null;
  let end = at + m[0].length;
  let label: string | null = null;
  const piped = /^\s*\|([^|]*)\|/.exec(text.slice(end));
  if (piped) {
    label = clean(piped[1] ?? "");
    end += piped[0].length;
  }
  return {
    link: {
      label,
      bothWays: m[2] === undefined || m[1] === "<",
      hidden: m[0].startsWith("~"),
    },
    end,
  };
}

// ── Sequence diagram ─────────────────────────────────────────────────────────

const PARTICIPANT = /^(?:participant|actor)\s+(.+?)(?:\s+as\s+(.+))?$/i;
const MESSAGE =
  /^([^:]+?)\s*(<<-->>|<<->>|-->>|->>|--x|-x|--\)|-\)|-->|->)\s*[+-]?\s*([^:]+?)\s*:\s*(.*)$/;
const NOTE = /^note\s+(?:over|left of|right of)\s+([^:]+?)\s*:\s*(.*)$/i;

function sequenceOutline(body: string[]): string[] {
  const names = new Map<string, string>();
  const name = (id: string): string => names.get(id.trim()) ?? clean(id);
  const lines: string[] = [];
  for (const statement of body) {
    const participant = PARTICIPANT.exec(statement);
    if (participant) {
      const id = (participant[1] ?? "").trim();
      names.set(id, clean(participant[2] ?? id));
      continue;
    }
    const message = MESSAGE.exec(statement);
    if (message) {
      const arrow = message[2]?.startsWith("<<") === true ? BOTH_WAYS : ARROW;
      const text = clean(message[4] ?? "");
      const said = text === "" ? "" : ` : ${text}`;
      lines.push(`${name(message[1] ?? "")} ${arrow} ${name(message[3] ?? "")}${said}`);
      continue;
    }
    const note = NOTE.exec(statement);
    if (note) {
      const over = (note[1] ?? "").split(",").map(name).join(", ");
      lines.push(`Note (${over}) : ${clean(note[2] ?? "")}`);
    }
  }
  return lines;
}

// ── Git graph ────────────────────────────────────────────────────────────────

const GIT_ID = /\bid:\s*"([^"]*)"/;
const GIT_TAG = /\btag:\s*"([^"]*)"/;

/** The value of `id: "…"` or `tag: "…"` in a git graph statement. */
function gitAttribute(statement: string, re: RegExp): string | null {
  const value = re.exec(statement)?.[1];
  return value === undefined ? null : clean(value);
}

/** The branch a statement names, quoted or not: `checkout "feature/x"`. */
function branchName(rest: string): string {
  const quoted = /^"([^"]*)"/.exec(rest.trim());
  if (quoted) return quoted[1] ?? "";
  return rest.trim().split(/\s+/)[0] ?? "";
}

function gitOutline(body: string[]): string[] {
  let branch = "main";
  const lines: string[] = [];
  for (const statement of body) {
    const [verb = "", ...words] = statement.split(/\s+/);
    const rest = words.join(" ");
    if (verb === "commit") {
      const id = gitAttribute(statement, GIT_ID);
      const tag = gitAttribute(statement, GIT_TAG);
      const named = id === null ? "Commit" : `Commit « ${id} »`;
      lines.push(`${named} sur ${branch}${tag === null ? "" : ` (étiquette ${tag})`}`);
    } else if (verb === "branch") {
      // A new branch is also where the next commits go, as in git switch -c.
      const created = branchName(rest);
      lines.push(`Branche ${created} créée depuis ${branch}`);
      branch = created;
    } else if (verb === "checkout" || verb === "switch") {
      branch = branchName(rest);
    } else if (verb === "merge") {
      const id = gitAttribute(statement, GIT_ID);
      lines.push(
        `${branchName(rest)} fusionnée dans ${branch}${id === null ? "" : ` : « ${id} »`}`,
      );
    } else if (verb === "cherry-pick") {
      const id = gitAttribute(statement, GIT_ID);
      lines.push(`Commit${id === null ? "" : ` « ${id} »`} repris sur ${branch}`);
    }
  }
  return lines;
}

// ── Any other kind ───────────────────────────────────────────────────────────

const ANY_ARROW = /\s*(?:<<-->>|<<->>|-->>|->>|-\.->|==>|-->|->)\s*/g;

function genericOutline(body: string[]): string[] {
  return body
    .filter((statement) => !STYLING.test(statement) && statement !== "end")
    .map((statement) =>
      clean(
        statement
          .replace(/^title\s+/i, "")
          .replace(ANY_ARROW, ` ${ARROW} `)
          .replace(/"/g, ""),
      ),
    )
    .filter((line) => line !== "");
}
