// Guards every <Diagram> block in content/lessons against the MDX pipeline.
//
// The children of <Diagram> are parsed as markdown, so the source mermaid ends
// up receiving is not the source that was written. `A[Doc](ref)` becomes a
// link, `*mot*` an <em>, `<br/>` a real <br> node. The lesson page then walks
// that React tree back into a string, and any mismatch is a diagram that draws
// wrong - or not at all - with no error anywhere.
//
// This check runs a diagram through the remark/rehype plugins the lesson page
// uses, rebuilds the source the way the Diagram component does, and fails when
// the round trip is not faithful. Indentation is normalised on both sides: MDX
// dedents JSX children and mermaid does not care about leading spaces.
//
// It then hands that rebuilt source to mermaid's own parser. A faithful round
// trip says nothing about whether mermaid can read the result: a label with a
// parenthesis left unquoted, a keyword used as a node id, and the diagram
// falls back to text on the page. The parser runs in jsdom, as in the browser;
// drawing needs a real layout engine and stays out of reach here.
//
//   pnpm --filter @cyberlearn/web content:diagrams
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../content/lessons");

// Mermaid reads window and document while it loads (its sanitiser does), so
// they have to exist before the import, not after.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false });

// Copies, not imports. The page's own pieces live in TypeScript sources: the
// remark list in packages/lib (LESSON_REMARK_PLUGINS, whose modules import each
// other as "./x.js" and "../y" for files that are x.ts and y.ts) and the
// extractor below in apps/web. Plain node cannot load either without a
// TypeScript loader, which the web app does not depend on. The two remark
// plugins left out of REMARK_PLUGINS deal only with {…} expressions, the
// values of component props and import/export lines; none of them changes the
// text of a diagram. A brace inside one still fails here, either as code that
// does not run or as a round trip that lost it. The glossary the page adds
// last (rehypeGlossary) reads no component's children but a Callout's.
const REMARK_PLUGINS = [remarkGfm];

// Kept in sync with apps/web/lib/mdx/extract-diagram-source.ts.
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "pre",
  "blockquote",
  "li",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "tr",
]);

function extractDiagramSource(node) {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(extractDiagramSource).join("");
  if (React.isValidElement(node)) {
    if (node.type === "br") return "<br/>";
    const inner = extractDiagramSource(node.props.children);
    return typeof node.type === "string" && BLOCK_TAGS.has(node.type) ? `${inner}\n` : inner;
  }
  return "";
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (entry.endsWith(".mdx")) files.push(full);
  }
  return files;
}

/** Every <Diagram>…</Diagram> block, with the raw body and its line number. */
function findDiagrams(text) {
  const lines = text.split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^<Diagram(\s|>)/.test(lines[i]) || /\/>\s*$/.test(lines[i])) continue;
    const end = lines.findIndex((l, j) => j > i && /^<\/Diagram>/.test(l));
    if (end === -1) {
      blocks.push({ line: i + 1, body: null, snippet: null });
      continue;
    }
    blocks.push({
      line: i + 1,
      body: lines.slice(i + 1, end).join("\n"),
      snippet: lines.slice(i, end + 1).join("\n"),
    });
    i = end;
  }
  return blocks;
}

/** Mermaid ignores leading whitespace and blank lines; the comparison should too. */
function normalise(source) {
  return source
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .join("\n");
}

const failures = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const rel = path.relative(process.cwd(), file);
  for (const block of findDiagrams(readFileSync(file, "utf8"))) {
    if (block.body === null) {
      failures.push({ file: rel, line: block.line, reason: "<Diagram> is never closed" });
      continue;
    }
    checked++;

    let piped = null;
    try {
      const captured = [];
      const Diagram = ({ children }) => {
        captured.push(extractDiagramSource(children).trim());
        return null;
      };
      const compiled = await compile(block.snippet, {
        outputFormat: "function-body",
        development: false,
        remarkPlugins: REMARK_PLUGINS,
        rehypePlugins: [rehypeSlug, rehypeHighlight],
      });
      const mod = await run(compiled, { ...runtime, baseUrl: import.meta.url });
      renderToStaticMarkup(React.createElement(mod.default, { components: { Diagram } }));
      piped = captured[0] ?? "";
    } catch (error) {
      failures.push({
        file: rel,
        line: block.line,
        reason: `MDX compile failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    const expected = normalise(block.body);
    const actual = normalise(piped);
    if (expected !== actual) {
      failures.push({
        file: rel,
        line: block.line,
        reason: "markdown altered the diagram before mermaid saw it",
        expected,
        actual,
      });
      continue;
    }

    try {
      await mermaid.parse(piped);
    } catch (error) {
      failures.push({
        file: rel,
        line: block.line,
        reason: `mermaid cannot read the diagram: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}

if (failures.length > 0) {
  for (const f of failures) {
    console.error(`\n✗ ${f.file}:${f.line}: ${f.reason}`);
    if (f.expected !== undefined) {
      console.error("  written:");
      for (const l of f.expected.split("\n")) console.error(`    ${l}`);
      console.error("  received by mermaid:");
      for (const l of f.actual.split("\n")) console.error(`    ${l}`);
    }
  }
  console.error(
    `\n${String(failures.length)} diagram(s) out of ${String(checked)} would not draw on the lesson page.`,
  );
  console.error("Markdown syntax inside a diagram is the usual cause of a round trip that fails:");
  console.error("[label](x) becomes a link, *text* and _text_ become emphasis. Escape them or");
  console.error(
    'reword the label. When mermaid cannot read a diagram, quote the label: A["x (y)"].',
  );
  process.exit(1);
}

console.log(
  `✓ ${String(checked)} lesson diagrams survive the MDX pipeline unchanged, and mermaid reads them all`,
);
