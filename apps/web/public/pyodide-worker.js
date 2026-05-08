/* eslint-disable */
// Pyodide Web Worker — executes Python code in isolation.
// Loaded via new Worker('/pyodide-worker.js') from script-runner.tsx.
// Architecture rule: Pyodide runs in Web Worker only, 10s timeout enforced by caller.

importScripts("/runtimes/pyodide/pyodide.js");

let pyodideReady = null;

function initPyodide() {
  if (!pyodideReady) {
    pyodideReady = loadPyodide({
      indexURL: "/runtimes/pyodide/",
    }).then((py) => {
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
