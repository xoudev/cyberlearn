/* eslint-disable */
/**
 * Shared Python Web Worker - handles two protocols dispatched by message shape:
 *
 * Run mode (CodePlayground):
 *   inbound:  { id, code }
 *   outbound: { id, output, error }
 *
 * Test mode (PythonChallenge):
 *   inbound:  { id, code, tests: TestCase[] }
 *   outbound: { id, results: TestResult[] }
 *
 * The presence of `tests` array switches modes. If you add a third
 * protocol later, refactor to an explicit `type` discriminator to
 * avoid shape ambiguity (tracked in docs/hardening/known-issues.md).
 *
 * Every run goes through py-harness.js: a fresh namespace per run and per
 * test, and errors reduced to the learner's own lines. Both replies carry an
 * optional `hint` (French) next to the error, and a test result carries what
 * the code printed (`output`).
 *
 * Lifecycle: { type: "ready" } once Pyodide and the harness are loaded, or
 * { type: "error" } if they are not. The page waits for one of the two before
 * starting its execution timeout, so a slow first download is not reported
 * as the learner's infinite loop.
 *
 * Hardening: ALL neutralizations (network, storage, addEventListener
 * freeze, onmessage/onerror freeze) run INSIDE loadPyodide().then(),
 * AFTER Pyodide has fully initialized. Pyodide itself calls
 * self.addEventListener("message") internally during its async boot -
 * freezing before that completes kills the init Promise.
 *
 * Message handler hardening (defense against validation bypass):
 *   - _addListener saved before importScripts so user code cannot
 *     inject capture-phase listeners that fire before our handler
 *   - self.addEventListener overridden to throw for "message" /
 *     "messageerror" types (capture-phase bypass vector closed)
 *   - self.onmessage frozen via defineProperty (writable:false,
 *     configurable:false) - property assignment override prevented
 *   - self.onerror frozen similarly - error swallowing prevented
 *   - Real handler registered via saved _addListener, inaccessible
 *     to user code running inside runPythonAsync(...)
 *   - All freezes applied AFTER loadPyodide() - Pyodide needs
 *     addEventListener during its own async init sequence.
 */

// Save the original before importScripts - Pyodide must not affect this reference.
const _addListener = self.addEventListener.bind(self);

// importScripts must run at top level, before any neutralization.
importScripts("/runtimes/pyodide/pyodide.js");
importScripts("/workers/py-harness.js");

// The harness entry points, set once Pyodide is up. Kept here rather than in
// Python's globals so nothing the learner runs can reach or replace them.
let runTest = null;
let runScript = null;

let pyodideReady = null;

function initPyodide() {
  if (!pyodideReady) {
    pyodideReady = loadPyodide({ indexURL: "/runtimes/pyodide/" }).then((py) => {
      // ── Hardening - ALL neutralizations AFTER loadPyodide() completes ───────
      // Pyodide uses fetch/importScripts/addEventListener during boot;
      // safe to block only after init.

      // 1. Network APIs - block any outbound call from user code
      self.fetch = () => {
        throw new Error("Network access is not allowed in challenge code.");
      };
      self.XMLHttpRequest = function () {
        throw new Error("Network access is not allowed in challenge code.");
      };
      self.WebSocket = function () {
        throw new Error("Network access is not allowed in challenge code.");
      };
      self.EventSource = function () {
        throw new Error("Network access is not allowed in challenge code.");
      };

      // 1b. sendBeacon - not in WorkerNavigator spec but defensively blocked;
      //     some Chromium versions have exposed it on navigator in Workers.
      if (typeof self.navigator !== "undefined" && self.navigator.sendBeacon) {
        self.navigator.sendBeacon = () => {
          throw new Error("Network access is not allowed in challenge code.");
        };
      }

      // 2. Storage APIs - prevent cross-challenge state pollution
      self.indexedDB = undefined;
      self.caches = undefined;

      // 3. Dynamic script loading - prevent loading arbitrary code mid-run
      self.importScripts = () => {
        throw new Error("Dynamic script loading is not allowed.");
      };

      // 4. Python-level micropip block - fetch neutralization above already
      //    prevents network calls, but this gives a clean ImportError at import
      //    time rather than a fetch error.
      py.runPython(`
import sys

class _BlockedImport:
    _blocked = {"micropip"}
    def find_spec(self, name, path, target=None):
        if name.split(".")[0] in self._blocked:
            raise ImportError(
                f"'{name}' is not available in the challenge environment."
            )
        return None

sys.meta_path.insert(0, _BlockedImport())
del _BlockedImport
`);

      // 5. Block capture-phase message listener injection from user code.
      //    Must run AFTER loadPyodide() - Pyodide calls addEventListener
      //    internally during its async initialization sequence.
      //    Two vectors closed:
      //    a) Own property frozen (configurable:false) → delete self.addEventListener fails
      //    b) Prototype also frozen → Object.getPrototypeOf(self).addEventListener.call(...) blocked
      const _blockedAddListener = (type, listener, options) => {
        if (type === "message" || type === "messageerror") {
          throw new Error("Adding message listeners is not allowed.");
        }
        return _addListener(type, listener, options);
      };
      Object.defineProperty(self, "addEventListener", {
        value: _blockedAddListener,
        writable: false,
        configurable: false,
        enumerable: false,
      });
      try {
        Object.defineProperty(Object.getPrototypeOf(self), "addEventListener", {
          value: _blockedAddListener,
          writable: false,
          configurable: false,
        });
      } catch (_) {
        // Skip if prototype property is already non-configurable in this engine
      }

      // 6. Freeze onmessage and onerror - property assignment cannot override them.
      Object.defineProperty(self, "onmessage", {
        value: null,
        writable: false,
        configurable: false,
      });
      Object.defineProperty(self, "onerror", {
        value: null,
        writable: false,
        configurable: false,
      });

      // 7. The harness, in a namespace of its own.
      const harness = py.toPy({});
      py.runPython(self.CL_PY_HARNESS, { globals: harness });
      runTest = harness.get("run_test");
      runScript = harness.get("run_script");

      self.postMessage({ type: "ready" });
      return py;
    });
  }
  return pyodideReady;
}

// Start loading Pyodide immediately on worker creation
initPyodide().catch((err) => {
  self.postMessage({ type: "error", error: String(err) });
});

async function handleMessage(event) {
  const { id, code, tests } = event.data;

  if (Array.isArray(tests)) {
    // ── Test mode - PythonChallenge protocol ──────────────────────────────────
    // Inbound:  { id, code, tests: TestCase[] }
    // Outbound: { id, results: TestResult[] }
    try {
      await initPyodide();
    } catch (err) {
      self.postMessage({
        id,
        results: tests.map((t) => ({
          input: t.input,
          expected: t.expected,
          actual: "Python n'a pas pu démarrer : " + String(err),
          passed: false,
          isError: true,
        })),
      });
      return;
    }

    const results = [];
    for (const test of tests) {
      const r = JSON.parse(await runTest(code, test.input));
      results.push({
        input: test.input,
        expected: test.expected,
        actual: r.ok ? r.actual : r.error,
        passed: r.ok && r.actual === test.expected,
        isError: !r.ok,
        hint: r.hint ?? null,
        output: r.output,
      });
    }
    self.postMessage({ id, results });
  } else {
    // ── Run mode - CodePlayground protocol ────────────────────────────────────
    // Inbound:  { id, code }
    // Outbound: { id, output, error, hint }
    try {
      await initPyodide();
    } catch (err) {
      self.postMessage({
        id,
        output: "",
        error: "Python n'a pas pu démarrer : " + String(err),
        hint: null,
      });
      return;
    }
    const r = JSON.parse(await runScript(code));
    self.postMessage({ id, output: r.output, error: r.ok ? null : r.error, hint: r.hint ?? null });
  }
}

// Real handler - registered via saved original, invisible to user code.
_addListener("message", handleMessage);
