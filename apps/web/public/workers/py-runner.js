/* eslint-disable */
/**
 * Shared Python Web Worker — handles two protocols dispatched by message shape:
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
 * Hardening: all network/storage APIs are neutralized AFTER
 * loadPyodide() completes — see pyodide-worker.js (sub-step B) for
 * the parallel implementation in challenges SCRIPT mode.
 */

// importScripts must run at top level, before any neutralization.
importScripts("/runtimes/pyodide/pyodide.js");

let pyodideReady = null;

function initPyodide() {
  if (!pyodideReady) {
    pyodideReady = loadPyodide({ indexURL: "/runtimes/pyodide/" }).then((py) => {
      // ── Hardening — all neutralizations AFTER loadPyodide() completes ──────
      // Pyodide uses fetch/importScripts during boot; safe to block only after init.

      // 1. Network APIs — block any outbound call from user code
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

      // 1b. sendBeacon — not in WorkerNavigator spec but defensively blocked;
      //     some Chromium versions have exposed it on navigator in Workers.
      if (typeof self.navigator !== "undefined" && self.navigator.sendBeacon) {
        self.navigator.sendBeacon = () => {
          throw new Error("Network access is not allowed in challenge code.");
        };
      }

      // 2. Storage APIs — prevent cross-challenge state pollution
      self.indexedDB = undefined;
      self.caches = undefined;

      // 3. Dynamic script loading — prevent loading arbitrary code mid-run
      self.importScripts = () => {
        throw new Error("Dynamic script loading is not allowed.");
      };

      // 4. Python-level micropip block — fetch neutralization above already
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

self.onmessage = async (event) => {
  const { id, code, tests } = event.data;

  if (Array.isArray(tests)) {
    // ── Test mode — PythonChallenge protocol ──────────────────────────────────
    // Inbound:  { id, code, tests: TestCase[] }
    // Outbound: { id, results: TestResult[] }
    let py;
    try {
      py = await initPyodide();
    } catch (err) {
      self.postMessage({
        id,
        results: tests.map((t) => ({
          input: t.input,
          expected: t.expected,
          actual: "Worker initialization failed: " + String(err),
          passed: false,
          isError: true,
        })),
      });
      return;
    }

    const results = [];
    for (const test of tests) {
      try {
        const snippet = code + "\n__challenge_result__ = str(" + test.input + ")";
        await py.runPythonAsync(snippet);
        const actual = String(py.globals.get("__challenge_result__") ?? "None");
        results.push({
          input: test.input,
          expected: test.expected,
          actual,
          passed: actual === test.expected,
        });
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        const clean = msg
          .split("\n")
          .filter((l) => !l.includes("/lib/python") && !l.includes("_pyodide"))
          .join("\n")
          .trim();
        results.push({
          input: test.input,
          expected: test.expected,
          actual: clean || msg,
          passed: false,
          isError: true,
        });
      }
    }
    self.postMessage({ id, results });
  } else {
    // ── Run mode — CodePlayground protocol ────────────────────────────────────
    // Inbound:  { id, code }
    // Outbound: { id, output, error }
    const output = [];
    try {
      const py = await initPyodide();
      py.setStdout({ batched: (text) => output.push(text) });
      py.setStderr({ batched: (text) => output.push("[31m" + text + "[0m") });
      await py.runPythonAsync(code);
      self.postMessage({ id, output: output.join("\n"), error: null });
    } catch (err) {
      self.postMessage({ id, output: output.join("\n"), error: err.message });
    }
  }
};
