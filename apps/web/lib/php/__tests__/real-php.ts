import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createPhpLab,
  type LabRequest,
  type LabResponse,
} from "../../../public/workers/php-lab-core.mjs";

/**
 * The PHP a lab runs, in a test: the same worker code on the same files as the
 * site ships (public/runtimes/php, public/workers), the compiled module read
 * from disk instead of fetched. Slow to start (about a second), then fast.
 */
const RUNTIME = path.resolve(__dirname, "../../../public/runtimes/php");

const lab = createPhpLab({
  runtimeUrl: pathToFileURL(`${RUNTIME}${path.sep}`).href,
  loadModule: () =>
    WebAssembly.compile(
      readFileSync(path.join(RUNTIME, "6733ae879e026f8b36961884052b87de4def4e15.wasm")),
    ),
});

export function playOnPhp(
  files: Record<string, string>,
  request: Partial<LabRequest> & Pick<LabRequest, "path">,
): Promise<LabResponse> {
  return lab.run(files, { method: "GET", query: "", body: "", cookie: "", ...request });
}
