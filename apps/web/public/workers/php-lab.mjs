/**
 * The Web Worker of <PhpLab>: a real PHP, off the page's thread.
 *
 * Protocol:
 *   inbound:  { id, files, request }   files: pages by path, request: see LabRequest
 *   outbound: { id, response }         response: { status, headers, body, fatal }
 *          or { id, error }
 *
 * In a worker so that a page that never ends (a loop with no way out) cannot
 * freeze the tab: PHP has no way to stop itself in WebAssembly, so past the
 * time limit the page terminates the worker, which is the only way to stop it.
 * What happens to a request is in php-lab-core.mjs.
 */
import { createPhpLab } from "./php-lab-core.mjs";

const RUNTIME_URL = new URL("/runtimes/php/", self.location.origin).href;
const WASM_URL = `${RUNTIME_URL}6733ae879e026f8b36961884052b87de4def4e15.wasm`;

/** Compiled while it downloads; the server may send it without its wasm type, then it is read whole. */
async function loadModule() {
  try {
    return await WebAssembly.compileStreaming(fetch(WASM_URL));
  } catch {
    const response = await fetch(WASM_URL);
    if (!response.ok) throw new Error(`PHP : ${String(response.status)} sur ${WASM_URL}`);
    return WebAssembly.compile(await response.arrayBuffer());
  }
}

const lab = createPhpLab({ runtimeUrl: RUNTIME_URL, loadModule });

self.onmessage = async (event) => {
  const { id, files, request } = event.data;
  try {
    self.postMessage({ id, response: await lab.run(files, request) });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Le serveur PHP n'a pas pu démarrer.",
    });
  }
};
