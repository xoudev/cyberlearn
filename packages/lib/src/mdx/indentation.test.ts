import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { evaluate } from "@mdx-js/mdx";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { describe, expect, it } from "vitest";
import { protectPropIndentation } from "./indentation.js";
import { LESSON_COMPONENT_NAMES, LESSON_REMARK_PLUGINS } from "./check.js";

function Capture(): null {
  return null;
}

function Stub(): null {
  return null;
}

const COMPONENTS: Record<string, unknown> = {
  ...Object.fromEntries(LESSON_COMPONENT_NAMES.map((name) => [name, Stub])),
  CodePlayground: Capture,
  PythonChallenge: Capture,
};

/** The props of every playground element in a tree, in order. */
function collect(node: ReactNode, seen: Record<string, unknown>[]): void {
  if (Array.isArray(node)) {
    for (const child of node) collect(child as ReactNode, seen);
    return;
  }
  if (!isValidElement(node)) return;
  // SAFETY: an element's props are an object; only read here.
  const props = node.props as Record<string, unknown>;
  if (node.type === Capture) seen.push(props);
  collect(props.children as ReactNode, seen);
}

/** The props each playground receives, in order, once the MDX is compiled and run. */
async function propsOf(mdx: string): Promise<Record<string, unknown>[]> {
  const { default: Content } = await evaluate(mdx, {
    ...runtime,
    remarkPlugins: LESSON_REMARK_PLUGINS,
    development: false,
  });
  // SAFETY: the default export of compiled MDX is its content function.
  const tree = (Content as unknown as (p: { components: Record<string, unknown> }) => ReactNode)({
    components: COMPONENTS,
  });
  const seen: Record<string, unknown>[] = [];
  collect(tree, seen);
  return seen;
}

const PYTHON = [
  "age = 20",
  "if age >= 18:",
  '    print("majeur")',
  "    if age > 60:",
  '        print("senior")',
  "else:",
  '    print("mineur")',
].join("\n");

describe("protectPropIndentation", () => {
  it("is needed: without it, MDX takes spaces off each line", async () => {
    const [props] = await propsOf(`<CodePlayground starterCode={\`${PYTHON}\`} />`);
    expect(props?.starterCode).not.toBe(PYTHON);
  });

  it("hands the component the code exactly as written", async () => {
    const [props] = await propsOf(
      protectPropIndentation(`<CodePlayground starterCode={\`${PYTHON}\`} />`),
    );
    expect(props?.starterCode).toBe(PYTHON);
  });

  it("keeps tabs, blank lines and escapes the author wrote", async () => {
    const code = 'int main(void) {\n\tprintf("a\\\\n");\n\n    return 0;\n}';
    const [props] = await propsOf(
      protectPropIndentation(`<CodePlayground language="c" starterCode={\`${code}\`} />`),
    );
    expect(props?.starterCode).toBe('int main(void) {\n\tprintf("a\\n");\n\n    return 0;\n}');
  });

  it("reaches templates nested in other props", async () => {
    const mdx = protectPropIndentation(
      '<PythonChallenge prompt="p" starterCode={`def f(x):\n    return x`} tests={[{ "input": "f(1)", "expected": "1" }]} />',
    );
    const [props] = await propsOf(mdx);
    expect(props?.starterCode).toBe("def f(x):\n    return x");
  });

  it("leaves the element's own indent to the list it sits in", async () => {
    const mdx = [
      "- une étape",
      "",
      "  <CodePlayground starterCode={`for i in range(3):",
      "      print(i)`} />",
    ].join("\n");
    const [props] = await propsOf(protectPropIndentation(mdx));
    expect(props?.starterCode).toBe("for i in range(3):\n    print(i)");
  });

  it("keeps the lines of a quoted attribute too", async () => {
    const mdx = protectPropIndentation(
      '<PythonChallenge id="p" starterCode="def f(x):\n    if x:\n\treturn x" tests={[]} />',
    );
    expect(mdx).toContain('starterCode="def f(x):\n&#32;&#32;&#32;&#32;if x:\n&#9;return x"');
    const [props] = await propsOf(mdx);
    expect(props?.starterCode).toBe("def f(x):\n    if x:\n\treturn x");
  });

  it("does not touch prose, children, fenced code or one-line attributes", () => {
    const mdx = [
      "Un paragraphe avec `du code` et un {objet}.",
      "",
      "```python",
      "def f():",
      "    return `x`",
      "```",
      "",
      '<Callout type="info" title="  deux espaces">',
      "    texte indenté",
      "</Callout>",
    ].join("\n");
    expect(protectPropIndentation(mdx)).toBe(mdx);
  });

  it("leaves a template with ${} alone", () => {
    const mdx = "<CodePlayground starterCode={`a\n    ${b}`} />";
    expect(protectPropIndentation(mdx)).toBe(mdx);
  });

  it("does not mistake a > inside the braces for the end of the tag", () => {
    const mdx = "<CodePlayground starterCode={`if a > b:\n    print(a)`} />\n\nSuite.";
    expect(protectPropIndentation(mdx)).toBe(
      "<CodePlayground starterCode={`if a > b:\n\\x20\\x20\\x20\\x20print(a)`} />\n\nSuite.",
    );
  });
});

/**
 * Every multi-line starterCode of every lesson in content/, template or quoted,
 * reaches its component with the lines the author wrote: compiled for real,
 * compared with the source.
 */
const ROOT = path.resolve(__dirname, "../../../../content/lessons");

function lessonFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return lessonFiles(full);
    return name.endsWith(".mdx") ? [full] : [];
  });
}

/** The multi-line starterCode of a lesson, templates and quoted, as written. */
function writtenStarterCode(mdx: string): string[] {
  const templates = [
    ...mdx.matchAll(/^<(?:CodePlayground|PythonChallenge)\b[^\n]*?starterCode=\{`([^`]*)`\}/gms),
  ]
    .map((m) => cooked(m[1] ?? ""))
    .filter((code) => !code.includes("${"));
  const quoted = [
    ...mdx.matchAll(/^<(?:CodePlayground|PythonChallenge)\b[^\n]*?starterCode="([^"]*)"/gms),
  ].map((m) => m[1] ?? "");
  return [...templates, ...quoted].filter((code) => code.includes("\n"));
}

/** What a template's escapes come to, for the few the lessons use. */
function cooked(raw: string): string {
  return raw.replace(/\\([\\`$n"'])/g, (_m, c: string) => (c === "n" ? "\n" : c));
}

describe("the lessons of content/", () => {
  const files = lessonFiles(ROOT).filter(
    (f) => writtenStarterCode(readFileSync(f, "utf8").replace(/\r\n/g, "\n")).length > 0,
  );

  it("have multi-line playgrounds to protect", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [path.relative(ROOT, f), f]))(
    "%s keeps the indentation of its playgrounds",
    async (_name, file) => {
      const mdx = readFileSync(file, "utf8")
        .replace(/\r\n/g, "\n")
        .replace(/^---\n[\s\S]*?\n---\n/, "");
      const written = writtenStarterCode(mdx);
      const received = (await propsOf(protectPropIndentation(mdx)))
        .map((p) => p.starterCode)
        .filter((c): c is string => typeof c === "string" && c.includes("\n"));
      for (const code of written) expect(received).toContain(code);
    },
  );
});
