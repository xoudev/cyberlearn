import { readdirSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import path from "node:path";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Every Python exercise in the lessons, run twice through the harness, gives
 * the same answer twice.
 *
 * That is the property testers found missing: the same code, run again,
 * sometimes answered differently until the page was reloaded, because each
 * run inherited the previous one's variables. Here every playground and every
 * challenge of content/ is run twice in a row in one interpreter, the way a
 * learner clicks twice, and the two answers must match.
 */

const ROOT = path.resolve(__dirname, "../../../../..");
const WEB = path.join(ROOT, "apps/web");
const PYODIDE_DIR = `${path.join(WEB, "public/runtimes/pyodide")}/`;

interface Exercise {
  file: string;
  kind: "playground" | "challenge";
  code: string;
  calls: string[];
}

interface Captured {
  name: string;
  props: Record<string, unknown>;
}

function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textOf).join("\n");
  if (node && typeof node === "object" && "props" in node) {
    // SAFETY: a React element; only its children are read.
    return textOf((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

async function exercisesIn(file: string): Promise<Exercise[]> {
  const source = readFileSync(file, "utf8").replace(/^---[\s\S]*?---\n/, "");
  const captured: Captured[] = [];
  const stub =
    (name: string) =>
    (props: Record<string, unknown>): null => {
      captured.push({ name, props });
      return null;
    };
  const components = Object.fromEntries(
    [
      "Quiz",
      "QuizGroup",
      "CodePlayground",
      "SimulatedTerminal",
      "LessonVideo",
      "LessonImage",
      "ExternalLink",
      "Callout",
      "Diagram",
      "PythonChallenge",
    ].map((n) => [n, stub(n)]),
  );
  const { default: Content } = await evaluate(source, { ...runtime, development: false });
  // SAFETY: the compiled module's default export is its content function.
  const tree = (Content as (p: { components: unknown }) => unknown)({ components });
  // Components nested in others (a challenge in a Callout) are reached by
  // rendering children too.
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object" && "type" in node && "props" in node) {
      const el = node as { type: unknown; props: Record<string, unknown> };
      if (typeof el.type === "function") (el.type as (p: unknown) => unknown)(el.props);
      walk(el.props.children);
    }
  };
  walk(tree);

  const rel = path.relative(ROOT, file);
  const out: Exercise[] = [];
  for (const { name, props } of captured) {
    if (name === "CodePlayground" && (props.language ?? "python") === "python") {
      const code =
        typeof props.starterCode === "string" ? props.starterCode : textOf(props.children);
      out.push({ file: rel, kind: "playground", code: code.trim(), calls: [] });
    }
    if (name === "PythonChallenge" && Array.isArray(props.tests)) {
      const calls = (props.tests as { input?: unknown }[]).map((t) => String(t.input));
      out.push({
        file: rel,
        kind: "challenge",
        code: typeof props.starterCode === "string" ? props.starterCode.trim() : "",
        calls,
      });
    }
  }
  return out;
}

function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? mdxFiles(path.join(dir, e.name))
      : e.name.endsWith(".mdx")
        ? [path.join(dir, e.name)]
        : [],
  );
}

// Output that changes by design from one run to the next.
const NONDETERMINISTIC = /\brandom\b|\btime\(|datetime\.now|\buuid\b|\bid\(|secrets\./;

let runTest: (code: string, call: string) => Promise<string>;
let runScript: (code: string) => Promise<string>;
let exercises: Exercise[] = [];

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  // SAFETY: pyodide.js is the UMD build served to the browser; in Node it
  // exports loadPyodide.
  const { loadPyodide } = require(`${PYODIDE_DIR}pyodide.js`) as {
    loadPyodide: (o: { indexURL: string }) => Promise<{
      toPy(v: unknown): { get(n: string): (...a: string[]) => Promise<string> };
      runPython(c: string, o: { globals: unknown }): unknown;
    }>;
  };
  const py = await loadPyodide({ indexURL: PYODIDE_DIR });
  const scope: { CL_PY_HARNESS?: string } = {};
  runInNewContext(readFileSync(path.join(WEB, "public/workers/py-harness.js"), "utf8"), {
    self: scope,
  });
  const ns = py.toPy({});
  py.runPython(scope.CL_PY_HARNESS ?? "", { globals: ns });
  const test = ns.get("run_test");
  const script = ns.get("run_script");
  runTest = (code, call) => test(code, call);
  runScript = (code) => script(code);

  const all = await Promise.all(mdxFiles(path.join(ROOT, "content/lessons")).map(exercisesIn));
  exercises = all.flat().filter((e) => !NONDETERMINISTIC.test(e.code));
}, 120_000);

describe("the Python exercises of content/", () => {
  it("are found (the extraction has not silently stopped)", () => {
    expect(exercises.filter((e) => e.kind === "playground").length).toBeGreaterThan(50);
    expect(exercises.filter((e) => e.kind === "challenge").length).toBeGreaterThan(10);
  });

  it("answer the same way when run twice in a row", async () => {
    const differing: string[] = [];
    for (const e of exercises) {
      if (e.kind === "playground") {
        const first = await runScript(e.code);
        const second = await runScript(e.code);
        if (first !== second) differing.push(`${e.file} (playground)\n  ${first}\n  ${second}`);
      } else {
        for (const call of e.calls) {
          const first = await runTest(e.code, call);
          const second = await runTest(e.code, call);
          if (first !== second) differing.push(`${e.file} ${call}\n  ${first}\n  ${second}`);
        }
      }
    }
    expect(differing).toEqual([]);
  }, 120_000);

  it("never show Pyodide's own frames to a learner", async () => {
    const leaking: string[] = [];
    for (const e of exercises) {
      const replies =
        e.kind === "playground"
          ? [await runScript(e.code)]
          : await Promise.all(e.calls.map((c) => runTest(e.code, c)));
      for (const reply of replies) {
        if (/_pyodide|CodeRunner|<exec>|Traceback/.test(reply)) leaking.push(`${e.file}: ${reply}`);
      }
    }
    expect(leaking).toEqual([]);
  }, 120_000);
});
