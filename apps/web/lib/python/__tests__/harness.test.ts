import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * The Python harness, run by the real Pyodide the site serves.
 *
 * The first case is the one a tester reported, copied from the lesson "Listes
 * et tuples": a list passed to range(). The page answered with Pyodide's own
 * frames ("await CodeRunner(", "coroutine = eval(self.code, globals,
 * locals)") before the learner's, and line numbers that counted the test call
 * appended under their code.
 */

const WEB = path.resolve(__dirname, "../../..");
const PYODIDE_DIR = `${path.join(WEB, "public/runtimes/pyodide")}/`;

type PyProxyFn = (...args: string[]) => Promise<string>;
interface Pyodide {
  toPy(value: unknown): { get(name: string): PyProxyFn };
  runPython(code: string, options: { globals: unknown }): unknown;
}

interface Outcome {
  ok: boolean;
  output: string;
  actual?: string;
  error?: string;
  hint?: string | null;
}

let runTest: (code: string, call: string) => Promise<Outcome>;
let runScript: (code: string) => Promise<Outcome>;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  // SAFETY: pyodide.js is the UMD build served to the browser; in Node it
  // exports loadPyodide, typed here with the two methods the test uses.
  const { loadPyodide } = require(`${PYODIDE_DIR}pyodide.js`) as {
    loadPyodide: (o: { indexURL: string }) => Promise<Pyodide>;
  };
  const py = await loadPyodide({ indexURL: PYODIDE_DIR });

  // The worker loads the harness with importScripts, which sets it on `self`.
  const scope: { CL_PY_HARNESS?: string } = {};
  const source = readFileSync(path.join(WEB, "public/workers/py-harness.js"), "utf8");
  runInNewContext(source, { self: scope });

  const ns = py.toPy({});
  py.runPython(scope.CL_PY_HARNESS ?? "", { globals: ns });
  const test = ns.get("run_test");
  const script = ns.get("run_script");
  runTest = async (code, call) => JSON.parse(await test(code, call)) as Outcome;
  runScript = async (code) => JSON.parse(await script(code)) as Outcome;
}, 60_000);

const REPORTED = [
  "def solution(nombres):",
  "    total = 0",
  "    for i in range(nombres):",
  "        total += i",
  "    return total",
].join("\n");

describe("an error, as the learner reads it", () => {
  it("shows the learner's lines, not Pyodide's", async () => {
    const r = await runTest(REPORTED, "solution([3, 1, 2])");
    expect(r.ok).toBe(false);
    for (const internal of ["CodeRunner", "eval(self.code", "_pyodide", "<exec>", "Traceback"]) {
      expect(r.error).not.toContain(internal);
    }
  });

  it("points at the line they wrote, numbered as in their editor", async () => {
    const r = await runTest(REPORTED, "solution([3, 1, 2])");
    expect(r.error).toBe(
      [
        "Dans l'appel testé",
        "Ligne 3, dans solution",
        "    for i in range(nombres):",
        "TypeError: 'list' object cannot be interpreted as an integer",
      ].join("\n"),
    );
  });

  it("adds a hint in French", async () => {
    const r = await runTest(REPORTED, "solution([3, 1, 2])");
    expect(r.hint).toContain("type");
  });

  it("places a syntax error on its line, with a caret", async () => {
    const r = await runScript("x = 1\nif x == 1\n    print(x)");
    expect(r.error).toBe(
      ["Ligne 2", "    if x == 1", "             ^", "SyntaxError: expected ':'"].join("\n"),
    );
  });

  it("says when the test call itself fails", async () => {
    const r = await runTest("def solutoin(a):\n    return a", "solution(1)");
    expect(r.error).toBe("Dans l'appel testé\nNameError: name 'solution' is not defined");
  });

  it("folds a runaway recursion into one line", async () => {
    const r = await runScript("def f(n):\n    return f(n + 1)\n\nf(0)");
    expect(r.error).toMatch(/^Ligne 4\n {4}f\(0\)\nLigne 2, dans f \(répété \d+ fois\)\n/);
    expect(r.error?.split("\n").length).toBeLessThan(8);
  });
});

describe("each run starts clean", () => {
  it("does not remember the previous run's variables", async () => {
    expect((await runScript("resultat = 42")).ok).toBe(true);
    const r = await runScript("print(resultat)");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("NameError");
  });

  it("does not let a deleted function keep passing", async () => {
    // The reported "random" results: a helper removed from the code went on
    // existing until the page was reloaded.
    await runTest(
      "def aide(x):\n    return x * 2\ndef solution(x):\n    return aide(x)",
      "solution(2)",
    );
    const r = await runTest("def solution(x):\n    return aide(x)", "solution(2)");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("name 'aide' is not defined");
  });

  it("gives every test its own module state", async () => {
    const code = "vus = []\ndef solution(x):\n    vus.append(x)\n    return len(vus)";
    expect((await runTest(code, "solution(1)")).actual).toBe("1");
    expect((await runTest(code, "solution(2)")).actual).toBe("1");
  });

  it("does not let a run break the builtins of the next", async () => {
    await runScript("import builtins\nbuiltins.len = lambda x: 0");
    expect((await runScript("print(len([1, 2, 3]))")).output).toBe("3\n");
    expect((await runTest("def solution():\n    return 5", "solution()")).actual).toBe("5");
  });
});

describe("what a run reports", () => {
  it("returns the value as text, compared as before", async () => {
    const r = await runTest("def solution(a, b):\n    return a + b", "solution(2, 3)");
    expect(r).toMatchObject({ ok: true, actual: "5" });
  });

  it("keeps what the code printed, for the learner to debug with", async () => {
    const r = await runTest(
      "def solution(x):\n    print('vu', x)\n    return x",
      'solution("l\'été")',
    );
    expect(r.output).toBe("vu l'été\n");
    expect(r.actual).toBe("l'été");
  });

  it("runs top-level await", async () => {
    const r = await runScript("import asyncio\nawait asyncio.sleep(0)\nprint('fini')");
    expect(r).toMatchObject({ ok: true, output: "fini\n" });
  });
});
