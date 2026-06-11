/* eslint-disable */
// Pyodide Web Worker - executes Python code in isolation.
// Loaded via new Worker('/pyodide-worker.js') from script-runner.tsx.
// Architecture rule: Pyodide runs in Web Worker only, 10s timeout enforced by caller.

// importScripts must run at top level, before any neutralization.
importScripts("/runtimes/pyodide/pyodide.js");

let pyodideReady = null;

function initPyodide() {
  if (!pyodideReady) {
    pyodideReady = loadPyodide({
      indexURL: "/runtimes/pyodide/",
    }).then((py) => {
      // ── Hardening - all neutralizations AFTER loadPyodide() completes ────────
      // Pyodide itself uses fetch/importScripts during boot; blocking them before
      // init would prevent startup. Safe to neutralize once py is fully loaded.

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

      // 4. Python-level micropip block - setCdnUrl is internal to Pyodide and not
      //    on the public PyodideInterface, so we block micropip via sys.meta_path
      //    instead. fetch neutralization above already prevents network calls, but
      //    this gives a clean ImportError at import time rather than a fetch error.
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
  const { type, code, id } = event.data;
  if (type !== "run") return;

  const output = [];

  try {
    const py = await initPyodide();
    py.setStdout({ batched: (text) => output.push(text) });
    py.setStderr({ batched: (text) => output.push("[stderr] " + text) });
    await py.runPythonAsync(code);
    self.postMessage({ type: "result", id, output: output.join("\n"), error: null });
  } catch (err) {
    self.postMessage({
      type: "result",
      id,
      output: output.join("\n"),
      error: String(err),
    });
  }
};
